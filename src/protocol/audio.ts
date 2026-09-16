/**
 * EKeys 协议层 —— 音效板（0x16 AUDIO_FILE / 0x17 AUDIO_PAD）。
 *
 * 与设计文档 docs/web-config-design.md §11、EKeysApp/docs/protocol-usage.md §9.5
 * 的 wire 模型 1:1 对齐：
 *
 * - 0x16 AUDIO_FILE: op = list | begin | data | end | abort | delete
 *   list   请求 → 响应 {files, total_bytes, used_bytes, free_bytes}
 *   begin  请求 {name, size} → 响应 {received: 0, free_bytes}
 *   data   请求 {name, index, b64} → 响应 {received: N}
 *   end    请求 {name, size} → 响应 {free_bytes}
 *   abort  请求 {name} → 响应 ok
 *   delete 请求 {name} → 响应 {pads, free_bytes}
 *
 * - 0x17 AUDIO_PAD: op = get | set | play | stop
 *   get   请求 → 响应 {pads: [{key, file}, ...]}
 *   set   请求 {key, file} → 响应 ok（file = "" 表示解绑）
 *   play  请求 {key?} | {file?} → 响应 ok（试播：传 file；按键播放：传 key）
 *   stop  请求 → 响应 ok
 *
 * 与桌面端的差异（设计文档 §11.1 / §22）：
 * - 浏览器上传单文件 ≤ 2 MB；
 * - 文件名白名单 ^[a-z0-9_]{1,20}\\.(mp3|wav)$，原名 → sanitize 派生；
 * - 每块 1024B → base64 1368 字符（< 固件 kMaxB64Len = 1400）；
 * - 上传期间禁用页面 beforeunload。
 */

import { CMD } from "./commands";

/* ============================================================
 * 0x16 AUDIO_FILE
 * ============================================================ */

/** 0x16 的 op 子命令。 */
export const AUDIO_FILE_OP = {
  LIST: "list",
  BEGIN: "begin",
  DATA: "data",
  END: "end",
  ABORT: "abort",
  DELETE: "delete",
} as const;

export type AudioFileOp = (typeof AUDIO_FILE_OP)[keyof typeof AUDIO_FILE_OP];

/** 设备侧已上传的音频文件条目。 */
export interface AudioFileInfo {
  /** 不含扩展名的 base 名（<= 20B）。 */
  name: string;
  /** 含扩展名的展示名。 */
  file: string;
  /** 文件字节数。 */
  size: number;
}

/** list 响应。 */
export interface AudioListResp {
  files: AudioFileInfo[];
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
}

/** begin 响应。 */
export interface AudioBeginResp {
  received: number;
  free_bytes: number;
}

/** data 响应。 */
export interface AudioDataResp {
  received: number;
}

/** end / abort 响应。 */
export interface AudioEndResp {
  free_bytes: number;
}

/** delete 响应：附带解绑后的 pads 列表。 */
export interface AudioDeleteResp {
  pads: AudioPadBinding[];
  free_bytes: number;
}

/* ============================================================
 * 0x17 AUDIO_PAD
 * ============================================================ */

/** 0x17 的 op 子命令。 */
export const AUDIO_PAD_OP = {
  GET: "get",
  SET: "set",
  PLAY: "play",
  STOP: "stop",
} as const;

export type AudioPadOp = (typeof AUDIO_PAD_OP)[keyof typeof AUDIO_PAD_OP];

/** 单个键的音频绑定（key = 1..11，file = 文件名或 "" 表示未绑定）。 */
export interface AudioPadBinding {
  /** 1..11，与 Keymap 物理键编号一致。 */
  key: number;
  /** 已绑定的文件名（含扩展名）；空串表示未绑定。 */
  file: string;
}

/** get 响应。 */
export interface AudioPadGetResp {
  pads: AudioPadBinding[];
}

/* ============================================================
 * 协议层 payload 类型（请求体）
 * ============================================================ */

/** 0x16 list 请求：无需 body。 */
export interface AudioFileListReq {
  op: typeof AUDIO_FILE_OP.LIST;
}

/** 0x16 begin 请求。 */
export interface AudioFileBeginReq {
  op: typeof AUDIO_FILE_OP.BEGIN;
  name: string;
  size: number;
}

/** 0x16 data 请求。 */
export interface AudioFileDataReq {
  op: typeof AUDIO_FILE_OP.DATA;
  name: string;
  index: number;
  /** base64 encoded chunk（≤ 1024 raw bytes → 1368 chars）。 */
  b64: string;
}

/** 0x16 end 请求。 */
export interface AudioFileEndReq {
  op: typeof AUDIO_FILE_OP.END;
  name: string;
  size: number;
}

/** 0x16 abort 请求。 */
export interface AudioFileAbortReq {
  op: typeof AUDIO_FILE_OP.ABORT;
  name: string;
}

/** 0x16 delete 请求。 */
export interface AudioFileDeleteReq {
  op: typeof AUDIO_FILE_OP.DELETE;
  name: string;
}

export type AudioFileReq =
  | AudioFileListReq
  | AudioFileBeginReq
  | AudioFileDataReq
  | AudioFileEndReq
  | AudioFileAbortReq
  | AudioFileDeleteReq;

/** 0x17 get / stop：无需 body。 */
export interface AudioPadGetReq {
  op: typeof AUDIO_PAD_OP.GET;
}

/** 0x17 set：key + file（file="" 解绑）。 */
export interface AudioPadSetReq {
  op: typeof AUDIO_PAD_OP.SET;
  key: number;
  file: string;
}

/** 0x17 play：key 或 file 二选一。 */
export interface AudioPadPlayReq {
  op: typeof AUDIO_PAD_OP.PLAY;
  key?: number;
  file?: string;
}

/** 0x17 stop。 */
export interface AudioPadStopReq {
  op: typeof AUDIO_PAD_OP.STOP;
}

export type AudioPadReq =
  | AudioPadGetReq
  | AudioPadSetReq
  | AudioPadPlayReq
  | AudioPadStopReq;

/* ============================================================
 * 文件名校验 / 派生
 * ============================================================ */

/** 单文件上限 2 MB（设计文档 §11.1）。 */
export const AUDIO_FILE_MAX_BYTES = 2 * 1024 * 1024;

/** base name 上限 20B，扩展名 mp3/wav。 */
export const AUDIO_NAME_PATTERN = /^[a-z0-9_]{1,20}$/;
export const AUDIO_EXTS = ["mp3", "wav"] as const;
export type AudioExt = (typeof AUDIO_EXTS)[number];

/** 上传分块大小（设计文档 §11.1：1024B → base64 1368 字符 < kMaxB64Len 1400）。 */
export const AUDIO_CHUNK_BYTES = 1024;

/**
 * 把任意原始文件名派生为合法 EKeys 文件名：
 * - 取 basename（剥路径）；
 * - 仅保留 [a-z0-9_]，小写；
 * - 扩展名收敛为 mp3 / wav（其它后缀默认按 wav 处理）；
 * - base name 截断到 20B，扩展名截断到 3 字符。
 *
 * 该函数永远返回「合法可用」的结果，调用方不需再次校验。
 */
export function sanitizeAudioFileName(rawName: string): string {
  const trimmed = String(rawName || "").trim();
  // 1) basename
  const base = trimmed.split(/[\\/]/).pop() || "clip";
  // 2) 拆扩展名
  const dotIdx = base.lastIndexOf(".");
  const stem = dotIdx > 0 ? base.slice(0, dotIdx) : base;
  const ext0 = dotIdx > 0 ? base.slice(dotIdx + 1).toLowerCase() : "";
  const ext: AudioExt = (AUDIO_EXTS as readonly string[]).includes(ext0)
    ? (ext0 as AudioExt)
    : "wav";
  // 3) stem 字符清洗
  const stemClean = stem
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || "clip";
  return `${stemClean}.${ext}`;
}

/** 校验文件扩展名是否在白名单。 */
export function isAllowedAudioExt(name: string): boolean {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  if (!m) return false;
  return (AUDIO_EXTS as readonly string[]).includes(m[1].toLowerCase());
}

/** 把 AudioFileInfo 列表组装成与 AudioPadBinding[] 同序的 map（key → file）。 */
export function indexBindingsByKey(pads: AudioPadBinding[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const p of pads) {
    if (p.key >= 1 && p.key <= 11) {
      out[p.key] = p.file || "";
    }
  }
  return out;
}

/** 11 键的"占位空"绑定列表（key 1..11，file=""）。 */
export function emptyPadBindings(): AudioPadBinding[] {
  return Array.from({ length: 11 }, (_, i) => ({ key: i + 1, file: "" }));
}

/* ============================================================
 * 帧构造快捷函数
 * ============================================================ */

/** 构造 0x16 帧 payload。 */
export function audioFileReq(req: AudioFileReq): Record<string, unknown> {
  return { cmd: CMD.AUDIO_FILE, ...req };
}

/** 构造 0x17 帧 payload。 */
export function audioPadReq(req: AudioPadReq): Record<string, unknown> {
  return { cmd: CMD.AUDIO_PAD, ...req };
}
