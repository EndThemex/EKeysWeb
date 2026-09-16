/**
 * useAudioUploader — 音效板 0x16 / 0x17 命令的会话句柄。
 *
 * 设计要点（参考 docs/web-config-design.md §11）：
 * - 上传状态机：list → begin → (data × N) → end；任一步失败 / 用户取消 → abort；
 * - 上传期间禁用 beforeunload（避免半截文件占用设备空间）；
 * - 单文件 1024B / chunk → base64 1368 字符（< kMaxB64Len 1400）；
 * - 文件名先经 sanitizeAudioFileName 派生，再做白名单校验；
 * - 单文件 ≤ 2 MB；
 * - 设备 list / get 在 useEffect 中按 `connected` 自动调用一次；
 * - pad 绑定变更后写 0x17 set，UI 立即乐观更新；失败时回滚并提示。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_CHUNK_BYTES,
  AUDIO_FILE_MAX_BYTES,
  AUDIO_FILE_OP,
  AUDIO_PAD_OP,
  audioFileReq,
  audioPadReq,
  emptyPadBindings,
  isAllowedAudioExt,
  sanitizeAudioFileName,
  type AudioFileInfo,
  type AudioListResp,
  type AudioPadBinding,
  type AudioPadGetResp,
} from "../protocol";
import type { SerialFrame } from "./useSerial";

const REQUEST_TIMEOUT_MS = 5000;

export interface AudioUsage {
  /** 已用字节数（来自设备 list）。 */
  used: number;
  /** 剩余字节数（来自设备 list）。 */
  free: number;
  /** 总字节数。 */
  total: number;
}

export interface UploadProgress {
  /** 原始文件名（user 视角）。 */
  rawName: string;
  /** 设备侧最终文件 base 名。 */
  name: string;
  /** 已发送字节。 */
  sent: number;
  /** 总字节。 */
  total: number;
}

export interface UseAudioUploaderResult {
  files: AudioFileInfo[];
  pads: AudioPadBinding[];
  usage: AudioUsage;
  progress: UploadProgress | null;
  uploading: boolean;

  /** 进入页面 / 下拉刷新：拉 list + get。 */
  refresh(): Promise<void>;

  /** 上传一个本地文件（≤ 2 MB，mp3/wav）。失败抛错。 */
  upload(file: File): Promise<void>;
  /** 取消当前上传（触发 abort）；空闲时 no-op。 */
  cancel(): Promise<void>;

  /** 删除设备上一个文件（弹确认后调用）。 */
  deleteFile(name: string): Promise<void>;

  /** 把 key 绑定到指定 file；file = "" 解绑。乐观更新，失败回滚。 */
  bind(key: number, file: string): Promise<void>;

  /** 触发设备按键播放：传 key；试播：传 file。 */
  play(key?: number, file?: string): Promise<void>;
  stop(): Promise<void>;
}

export function useAudioUploader(
  sendCmd: <T extends SerialFrame = SerialFrame>(
    cmd: number,
    data?: object,
    timeoutMs?: number,
  ) => Promise<T>,
  connected: boolean,
): UseAudioUploaderResult {
  const [files, setFiles] = useState<AudioFileInfo[]>([]);
  const [pads, setPads] = useState<AudioPadBinding[]>(() => emptyPadBindings());
  const [usage, setUsage] = useState<AudioUsage>({ used: 0, free: 0, total: 0 });
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  // 用 ref 标记「正在上传」：避免在异步链路里读陈旧的 state
  const uploadingRef = useRef(false);
  const cancelRef = useRef(false);
  const [uploading, setUploading] = useState(false);

  /* ---------- 拉 list + get ---------- */
  const refresh = useCallback(async () => {
    if (!connected) return;
    try {
      const listFrame = await sendCmd<Record<string, unknown>>(
        0x16,
        audioFileReq({ op: AUDIO_FILE_OP.LIST }),
        REQUEST_TIMEOUT_MS,
      );
      const list = extractList(listFrame);
      setFiles(list.files);
      setUsage({ used: list.used_bytes, free: list.free_bytes, total: list.total_bytes });
    } catch {
      /* 设备可能未实现 0x16，list 失败不致命；UI 展示空 */
    }
    try {
      const padFrame = await sendCmd<Record<string, unknown>>(
        0x17,
        audioPadReq({ op: AUDIO_PAD_OP.GET }),
        REQUEST_TIMEOUT_MS,
      );
      const resp = extractPadGet(padFrame);
      setPads(resp.pads.length === 11 ? resp.pads : emptyPadBindings());
    } catch {
      /* 旧固件可能未实现 */
    }
  }, [connected, sendCmd]);

  useEffect(() => {
    if (!connected) {
      setFiles([]);
      setPads(emptyPadBindings());
      setUsage({ used: 0, free: 0, total: 0 });
      setProgress(null);
      uploadingRef.current = false;
      cancelRef.current = false;
      setUploading(false);
      return;
    }
    void refresh();
  }, [connected, refresh]);

  /* ---------- 上传 ---------- */
  const upload = useCallback(
    async (file: File) => {
      if (uploadingRef.current) {
        throw new Error("已有上传任务正在进行");
      }
      if (file.size > AUDIO_FILE_MAX_BYTES) {
        throw new Error(
          `文件过大（${file.size}B），单文件上限 ${AUDIO_FILE_MAX_BYTES}B`,
        );
      }
      if (file.size === 0) {
        throw new Error("空文件无法上传");
      }
      const deviceName = sanitizeAudioFileName(file.name);
      if (!isAllowedAudioExt(deviceName)) {
        throw new Error("文件名扩展名必须为 mp3 或 wav");
      }

      uploadingRef.current = true;
      cancelRef.current = false;
      setUploading(true);
      setProgress({
        rawName: file.name,
        name: deviceName,
        sent: 0,
        total: file.size,
      });

      // 上传期间阻止浏览器关闭 / 刷新
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", onBeforeUnload);

      try {
        // 1) begin
        await sendCmd(
          0x16,
          audioFileReq({ op: AUDIO_FILE_OP.BEGIN, name: deviceName, size: file.size }),
          REQUEST_TIMEOUT_MS,
        );
        if (cancelRef.current) {
          await safeAbort(sendCmd, deviceName);
          throw new Error("已取消");
        }

        // 2) data × N
        const buf = new Uint8Array(await file.arrayBuffer());
        for (let offset = 0; offset < buf.length; offset += AUDIO_CHUNK_BYTES) {
          if (cancelRef.current) {
            await safeAbort(sendCmd, deviceName);
            throw new Error("已取消");
          }
          const chunk = buf.subarray(
            offset,
            Math.min(offset + AUDIO_CHUNK_BYTES, buf.length),
          );
          const b64 = bytesToBase64(chunk);
          await sendCmd(
            0x16,
            audioFileReq({
              op: AUDIO_FILE_OP.DATA,
              name: deviceName,
              index: Math.floor(offset / AUDIO_CHUNK_BYTES),
              b64,
            }),
            REQUEST_TIMEOUT_MS,
          );
          setProgress((p) =>
            p ? { ...p, sent: Math.min(offset + chunk.length, p.total) } : p,
          );
        }

        // 3) end
        await sendCmd(
          0x16,
          audioFileReq({ op: AUDIO_FILE_OP.END, name: deviceName, size: file.size }),
          REQUEST_TIMEOUT_MS,
        );

        // 4) 刷新 list
        await refresh();
      } catch (e) {
        // 失败时尝试 abort 清理设备侧 .part；不让抛错掩盖原始错误
        await safeAbort(sendCmd, deviceName).catch(() => undefined);
        throw e;
      } finally {
        window.removeEventListener("beforeunload", onBeforeUnload);
        uploadingRef.current = false;
        cancelRef.current = false;
        setUploading(false);
        setProgress(null);
      }
    },
    [sendCmd, refresh],
  );

  const cancel = useCallback(async () => {
    if (!uploadingRef.current) return;
    cancelRef.current = true;
  }, []);

  /* ---------- 删除 ---------- */
  const deleteFile = useCallback(
    async (name: string) => {
      await sendCmd(
        0x16,
        audioFileReq({ op: AUDIO_FILE_OP.DELETE, name }),
        REQUEST_TIMEOUT_MS,
      );
      // 乐观删除 + refresh
      setFiles((prev) => prev.filter((f) => f.file !== name && f.name !== name));
      setPads((prev) => prev.map((p) => (p.file === name ? { ...p, file: "" } : p)));
      try {
        await refresh();
      } catch {
        /* refresh 失败不影响 delete 已成功 */
      }
    },
    [sendCmd, refresh],
  );

  /* ---------- 绑定 / 播放 / 停止 ---------- */
  const bind = useCallback(
    async (key: number, file: string) => {
      if (key < 1 || key > 11) throw new Error(`invalid key ${key}`);
      const previous = pads.find((p) => p.key === key)?.file ?? "";
      // 乐观更新
      setPads((prev) =>
        prev.map((p) => (p.key === key ? { ...p, file } : p)),
      );
      try {
        await sendCmd(
          0x17,
          audioPadReq({ op: AUDIO_PAD_OP.SET, key, file }),
          REQUEST_TIMEOUT_MS,
        );
      } catch (e) {
        // 回滚
        setPads((prev) =>
          prev.map((p) => (p.key === key ? { ...p, file: previous } : p)),
        );
        throw e;
      }
    },
    [pads, sendCmd],
  );

  const play = useCallback(
    async (key?: number, file?: string) => {
      if (key === undefined && !file) {
        throw new Error("play requires key or file");
      }
      await sendCmd(
        0x17,
        audioPadReq({ op: AUDIO_PAD_OP.PLAY, ...(key !== undefined ? { key } : {}), ...(file ? { file } : {}) }),
        REQUEST_TIMEOUT_MS,
      );
    },
    [sendCmd],
  );

  const stop = useCallback(async () => {
    await sendCmd(0x17, audioPadReq({ op: AUDIO_PAD_OP.STOP }), REQUEST_TIMEOUT_MS);
  }, [sendCmd]);

  return {
    files,
    pads,
    usage,
    progress,
    uploading,
    refresh,
    upload,
    cancel,
    deleteFile,
    bind,
    play,
    stop,
  };
}

/* ============================================================
 * Helpers
 * ============================================================ */

function extractList(frame: Record<string, unknown>): AudioListResp {
  // 兼容：list 数据可能在 data 字段或顶层
  const data = (frame.data as Record<string, unknown> | undefined) ?? null;
  const top = data ?? frame;
  const files = toFileList((top.files as unknown[] | undefined) ?? null);
  const total_bytes = toInt(top.total_bytes ?? top.total ?? 0);
  const used_bytes = toInt(top.used_bytes ?? top.used ?? 0);
  const free_bytes = toInt(top.free_bytes ?? top.free ?? 0);
  return { files, total_bytes, used_bytes, free_bytes };
}

function toFileList(raw: unknown[] | null): AudioFileInfo[] {
  if (!Array.isArray(raw)) return [];
  const out: AudioFileInfo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = String(r.name ?? r.basename ?? "").trim();
    const file = String(r.file ?? r.path ?? (name ? `${name}` : "")).trim();
    const size = toInt(r.size ?? r.bytes ?? 0);
    if (!name || !file) continue;
    out.push({ name, file, size });
  }
  return out;
}

function extractPadGet(frame: Record<string, unknown>): AudioPadGetResp {
  const data = (frame.data as Record<string, unknown> | undefined) ?? null;
  const top = data ?? frame;
  const raw = (top.pads as unknown[] | undefined) ?? null;
  const pads: AudioPadBinding[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const key = toInt(r.key);
      const file = String(r.file ?? r.path ?? "").trim();
      if (key < 1 || key > 11) continue;
      pads.push({ key, file });
    }
  }
  return { pads };
}

function toInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Uint8Array → base64（分块编码避免大字符串一次性占用堆）。 */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}

async function safeAbort(
  sendCmd: <T extends SerialFrame = SerialFrame>(
    cmd: number,
    data?: object,
    timeoutMs?: number,
  ) => Promise<T>,
  name: string,
) {
  try {
    await sendCmd(
      0x16,
      audioFileReq({ op: AUDIO_FILE_OP.ABORT, name }),
      2000,
    );
  } catch {
    /* ignore */
  }
}
