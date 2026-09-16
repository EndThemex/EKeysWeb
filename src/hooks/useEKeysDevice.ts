/**
 * useEKeysDevice — 封装 EKeys 串口协议的命令发送与响应匹配。
 *
 * 设计要点（参考 docs/web-config-design.md §5）：
 * - 每个请求生成唯一自增 seq，并把回调挂到 pending map；
 * - 响应识别：普通命令响应 cmd = request_cmd | 0x80，且 seq 匹配；
 * - 0x10 Profile State 是当前实现的例外，cmd 仍为 0x10，profile_state 位于顶层；
 * - 主动推送 (isPush)：cmd bit7=1 且 seq=0，通过 onPush 回调给上层；
 * - 进入 connected 后立即发 0x13 TIME_SET（epoch + tz）；
 * - 启动 5s 心跳，3 次超时切回 idle 并 emit heartbeatLost；
 * - visibilitychange 切回前台时立刻补一发心跳；
 * - sendCmd 通过内部串行 Promise 队列避免帧错位；
 * - 设备主动推送 0x87 时调用 maskSensitive 后写入 snapshot.config。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectEKeysSerial,
  isWebSerialSupported,
  type EKeysSerial,
  type SerialFrame,
} from "./useSerial";
import {
  CMD,
  encodeLine,
  isRespFor,
  maskSensitive,
  responseCmd,
  TOP_LEVEL_CMDS,
  type DeviceSettings,
} from "../protocol";

export { CMD };
export type { DeviceSettings };

/** 兼容旧调用方：DeviceConfig = DeviceSettings 的别名。 */
export type DeviceConfig = DeviceSettings;

/** 设备信息（0x03 响应）。 */
export interface DeviceInfo {
  device_name: string;
  device_id: string;
  firmware_version: string;
}

/** Profile 状态（0x10 响应 / 推送）。 */
export interface ProfileState {
  active_profile: number;
  profile_number: number;
  profile_name: string;
  has_custom_icon: boolean;
  icon_path: string;
}

/** 拉到的首屏快照。 */
export interface DeviceSnapshot {
  version: number | null;
  info: DeviceInfo | null;
  config: DeviceSettings | null;
  profile: ProfileState | null;
  /** 0x0b 固件信息（仅在 connect 后拉取）。 */
  firmwareInfo: FirmwareInfo | null;
  /** 0x0c VoiceText 推送累计（最近 N 条，FIFO）。 */
  voiceTexts: VoiceText[];
}

/** 0x0b 固件信息（M2 新增）。 */
export interface FirmwareInfo {
  version: string;
  build_date?: string;
  build_time?: string;
  [k: string]: unknown;
}

/** 0x0c VoiceText 推送（M2 新增）。 */
export interface VoiceText {
  id: number;
  text: string;
  ts: number;
  /** 是否自动进入（命中 voice_auto_enter）。 */
  auto_enter?: boolean;
}

const VOICE_TEXT_BUFFER = 50;

/** 连接阶段，UI 据此决定按钮可用状态与提示。 */
export type Phase = "idle" | "connecting" | "connected" | "disconnecting";

/** 分类后的错误，i18n 用 key 映射。 */
export type ErrorKind =
  | "unsupported"
  | "userCancelled"
  | "portBusy"
  | "noPort"
  | "openFailed"
  | "writeFailed"
  | "timeout"
  | "protocol"
  | "heartbeatLost"
  | "deviceLost"
  | "unknown";

export interface DeviceError {
  kind: ErrorKind;
  message: string;
}

const REQUEST_TIMEOUT_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_MAX_MISSED = 3;

/** 把任意 unknown 安全序列化为字符串，避免渲染成 `[object Object]`。 */
function safeStringify(v: unknown): string {
  if (v instanceof Error) return v.message || v.name || "Error";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  if (v === null || v === undefined) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** 把浏览器抛出的 Error 归类成 ErrorKind。 */
export function classify(
  err: unknown,
  fallbackKind: ErrorKind = "unknown",
): DeviceError {
  const raw = safeStringify(err);

  if (/could not open port|already open|port is in use|Failed to open/i.test(raw)) {
    return { kind: "portBusy", message: raw };
  }
  if (/No port selected|user (did not|cancelled|didn't) (choose|select)/i.test(raw)) {
    return { kind: "userCancelled", message: raw };
  }
  if (/No matching devices|No devices found/i.test(raw)) {
    return { kind: "noPort", message: raw };
  }
  if (/NetworkError|Failed to (read|write)|stream has been aborted|serial closed/i.test(raw)) {
    return { kind: "writeFailed", message: raw };
  }
  if (/超时|timeout/i.test(raw)) {
    return { kind: "timeout", message: raw };
  }
  if (/heartbeat|lost connection|deviceLost|serial stream closed/i.test(raw)) {
    return { kind: "deviceLost", message: raw };
  }
  if (/status.*[=:]\s*1|json parse error|unknown command|missing 'cmd'/i.test(raw)) {
    return { kind: "protocol", message: raw };
  }
  return { kind: fallbackKind, message: raw };
}

export function useEKeysDevice() {
  const [serial, setSerial] = useState<EKeysSerial | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<DeviceError | null>(null);
  const [snapshot, setSnapshot] = useState<DeviceSnapshot>({
    version: null,
    info: null,
    config: null,
    profile: null,
    firmwareInfo: null,
    voiceTexts: [],
  });
  const supported = isWebSerialSupported();

  const seqRef = useRef(1);
  const pending = useRef(new Map<number, (f: SerialFrame) => void>());
  const sendQueue = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef(0);

  // 心跳相关
  const heartbeatTimer = useRef<number | null>(null);
  const heartbeatMissed = useRef(0);

  // 推送订阅者
  const pushSubs = useRef<Set<(frame: SerialFrame) => void>>(new Set());
  const logSubs = useRef<Set<(line: string) => void>>(new Set());
  const errSubs = useRef<Set<(err: { kind: string; message: string }) => void>>(
    new Set(),
  );
  // TX 订阅者：每条 sendCmd 写出去后回调 (cmd, data) → 给 LogPanel 做记录
  const txSubs = useRef<Set<(cmd: number, data?: object) => void>>(new Set());

  /* ---------- 帧分发 ---------- */
  useEffect(() => {
    if (!serial) return;
    const offFrame = serial.onFrame((frame) => {
      const cmd = frame.cmd as number | undefined;
      const seq = (frame.seq as number) ?? 0;

      // 1) 请求-响应配对
      if (typeof cmd === "number") {
        if (cmd === CMD.PROFILE_STATE && "profile_state" in frame) {
          const cb = pending.current.get(seq);
          if (cb) {
            pending.current.delete(seq);
            cb(frame);
          }
          return;
        }
        if ((cmd & 0x80) !== 0 && seq !== 0) {
          // 心跳响应（0x8a）即使没有匹配的 pending cb，也清零 missed 计数
          if (cmd === responseCmd(CMD.HEARTBEAT)) {
            heartbeatMissed.current = 0;
          }
          const cb = pending.current.get(seq);
          if (cb) {
            pending.current.delete(seq);
            cb(frame);
          }
          return;
        }
        // 2) 主动推送：seq = 0 且 bit7 = 1
        if ((cmd & 0x80) !== 0 && seq === 0) {
          pushSubs.current.forEach((cb) => cb(frame));
          return;
        }
      }
    });
    const offLog = serial.onLogLine((line) => {
      logSubs.current.forEach((cb) => cb(line));
    });
    const offErr = serial.onError((err) => {
      errSubs.current.forEach((cb) => cb(err));
    });
    return () => {
      offFrame();
      offLog();
      offErr();
    };
  }, [serial]);

  /* ---------- 推送处理：写入 snapshot ---------- */
  const handlePush = useCallback((frame: SerialFrame) => {
    const cmd = frame.cmd as number;
    if (cmd === responseCmd(CMD.CONFIG_GET)) {
      // 0x87 全量配置推送：先脱敏，再写入
      const raw = frame.data as Partial<DeviceSettings> | undefined;
      if (raw) {
        const masked = maskSensitive({
          // 用当前 snapshot 做兜底，固件不一定带全部字段
          ...(snapshot.config ?? ({} as DeviceSettings)),
          ...raw,
        });
        setSnapshot((s) => ({ ...s, config: masked }));
      }
    } else if (cmd === CMD.PROFILE_STATE) {
      const prof = frame.profile_state as ProfileState | undefined;
      if (prof) setSnapshot((s) => ({ ...s, profile: prof }));
    } else if (cmd === responseCmd(CMD.FIRMWARE_INFO)) {
      // 0x8b 固件信息推送；兼容字段大小写
      const data = (frame.data as Record<string, unknown> | undefined) ?? undefined;
      const fw = (frame as Record<string, unknown>).firmware as
        | Record<string, unknown>
        | undefined;
      const src = data ?? fw;
      if (src) {
        const info: FirmwareInfo = {
          version: String(
            (src.version as unknown) ??
              (src.firmware_version as unknown) ??
              (src.fw_version as unknown) ??
              "",
          ),
          build_date: (src.build_date as string | undefined) ?? undefined,
          build_time: (src.build_time as string | undefined) ?? undefined,
        };
        setSnapshot((s) => ({ ...s, firmwareInfo: info }));
      }
    } else if (cmd === CMD.VOICE_TEXT) {
      // 0x0c 语音识别结果
      const data = (frame.data as Record<string, unknown> | undefined) ?? undefined;
      const text = String(
        (data?.text as unknown) ??
          (frame.text as unknown) ??
          (frame.voice_text as unknown) ??
          "",
      );
      if (text) {
        setSnapshot((s) => {
          const next = s.voiceTexts.concat({
            id: s.voiceTexts.length + 1,
            text,
            ts: Date.now(),
            auto_enter: Boolean(data?.auto_enter),
          });
          if (next.length > VOICE_TEXT_BUFFER) {
            return { ...s, voiceTexts: next.slice(next.length - VOICE_TEXT_BUFFER) };
          }
          return { ...s, voiceTexts: next };
        });
      }
    } else if (cmd === CMD.MUSIC_CONTROL) {
      // 0x0f 音乐控制推送：暂只计入 Log（未来可推 LogPanel）
    }
  }, [snapshot.config]);

  useEffect(() => {
    if (pushSubs.current.has(handlePush)) return;
    pushSubs.current.add(handlePush);
    return () => {
      pushSubs.current.delete(handlePush);
    };
  }, [handlePush]);

  /* ---------- 心跳 ---------- */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current !== null) return;
    heartbeatMissed.current = 0;
    heartbeatTimer.current = window.setInterval(() => {
      // 走 sendCmd 串行队列：超时由 REQUEST_TIMEOUT_MS 控制，
      // 收到 0x8a 响应时由 onFrame 分发链路清零 heartbeatMissed。
      void sendCmdRef.current(CMD.HEARTBEAT, undefined, REQUEST_TIMEOUT_MS)
        .then(() => {
          heartbeatMissed.current = 0;
        })
        .catch(() => {
          heartbeatMissed.current += 1;
          if (heartbeatMissed.current >= HEARTBEAT_MAX_MISSED) {
            emitSessionErrorRef.current({
              kind: "heartbeatLost",
              message: `heartbeat lost for ${HEARTBEAT_MAX_MISSED} cycles`,
            });
          }
        });
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current !== null) {
      window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    heartbeatMissed.current = 0;
  }, []);

  /* ---------- 内部 sendCmd（串行队列） ---------- */
  const serialRef = useRef<EKeysSerial | null>(null);
  useEffect(() => {
    serialRef.current = serial;
  }, [serial]);

  // sendCmd / emitSessionError 在声明顺序上晚于 startHeartbeat，
  // 但心跳定时器回调里要用到它们，因此用 ref 解耦声明顺序。
  const sendCmdRef = useRef<(cmd: number, data?: object, timeoutMs?: number) => Promise<SerialFrame>>(null as unknown as (cmd: number, data?: object, timeoutMs?: number) => Promise<SerialFrame>);
  const emitSessionErrorRef = useRef<(err: DeviceError) => void>(null as unknown as (err: DeviceError) => void);

  const sendCmd = useCallback(
    <T extends SerialFrame = SerialFrame>(
      cmd: number,
      data?: object,
      timeoutMs: number = REQUEST_TIMEOUT_MS,
    ): Promise<T> => {
      const op = async (): Promise<T> => {
        const s = serialRef.current;
        if (!s || s.closed) {
          throw classify(new Error("disconnecting"), "portBusy");
        }
        const seq = seqRef.current++;
        const payload = encodeLine({ cmd, seq, ...(data ? { data } : {}) });
        return new Promise<T>((resolve, reject) => {
          let settled = false;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            pending.current.delete(seq);
            window.clearTimeout(timer);
            fn();
          };
          const timer = window.setTimeout(() => {
            finish(() =>
              reject(
                classify(
                  new Error(`请求超时：cmd=0x${cmd.toString(16)} seq=${seq}`),
                  "timeout",
                ),
              ),
            );
          }, timeoutMs);

          pending.current.set(seq, (frame) => {
            if (cmd === CMD.PROFILE_STATE) {
              if (frame.cmd === CMD.PROFILE_STATE && "profile_state" in frame) {
                const st = (frame as { status?: unknown }).status;
                if (st !== undefined && st !== 0) {
                  finish(() =>
                    reject(
                      classify(
                        new Error(
                          `device status=${String(st)} cmd=0x${cmd.toString(16)}`,
                        ),
                        "protocol",
                      ),
                    ),
                  );
                  return;
                }
                finish(() => resolve(frame as T));
              }
              return;
            }
            if (!isRespFor(cmd, frame)) return;
            const st = (frame as { status?: unknown }).status;
            if (st !== undefined && st !== 0) {
              const errMsg = (frame as { error?: unknown }).error;
              finish(() =>
                reject(
                  classify(
                    new Error(
                      `设备返回错误 (cmd=0x${cmd.toString(16)}, status=${String(st)}): ${
                        typeof errMsg === "string" ? errMsg : ""
                      }`,
                    ),
                    "protocol",
                  ),
                ),
              );
              return;
            }
            finish(() => resolve(frame as T));
          });

          let writeOk = false;
          s.write(payload)
            .then(() => {
              writeOk = true;
              txSubs.current.forEach((cb) => cb(cmd, data));
            })
            .catch((e) => {
              if (writeOk) return;
              finish(() => reject(classify(e, "writeFailed")));
            });
        });
      };
      // 串行化：等上一条 cmd 全部完成（包括 catch）再发下一条
      const next = sendQueue.current.then(op, op);
      sendQueue.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    [],
  );
  sendCmdRef.current = sendCmd;

  /* ---------- 设备错误 → session 终止 ---------- */
  const emitSessionError = useCallback((err: DeviceError) => {
    setError(err);
    setPhase("idle");
    setSerial(null);
    setSnapshot({
      version: null,
      info: null,
      config: null,
      profile: null,
      firmwareInfo: null,
      voiceTexts: [],
    });
    pending.current.forEach((cb) => {
      cb({ cmd: 0, seq: 0, status: 1, error: err.message });
    });
    pending.current.clear();
  }, []);
  emitSessionErrorRef.current = emitSessionError;

  useEffect(() => {
    const off = (cb: (err: { kind: string; message: string }) => void) => {
      errSubs.current.add(cb);
      return () => {
        errSubs.current.delete(cb);
      };
    };
    const unsub = off((err) => {
      const e = classify(new Error(err.message), (err.kind as ErrorKind) ?? "deviceLost");
      emitSessionError(e);
      stopHeartbeat();
    });
    return unsub;
  }, [emitSessionError, stopHeartbeat]);

  /* ---------- 可见性 → 立刻补一发心跳 ---------- */
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      if (phase !== "connected") return;
      // 立刻补发：走 sendCmd 串行队列
      void sendCmd(CMD.HEARTBEAT, undefined, 1500).catch(() => {
        /* 心跳无响应不致命；下一周期会再补 */
      });
      heartbeatMissed.current = 0;
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase, sendCmd]);

  /* ---------- TIME_SET ---------- */
  const sendTimeSet = useCallback(async () => {
    const tz = -new Date().getTimezoneOffset() / 60;
    const epoch = Math.floor(Date.now() / 1000);
    try {
      await sendCmd(CMD.TIME_SET, { epoch, tz });
    } catch {
      /* 设备不支持不影响其他流程 */
    }
  }, [sendCmd]);

  /* ---------- connect / disconnect ---------- */
  const connect = useCallback(async (): Promise<DeviceSnapshot> => {
    if (!supported) {
      const e: DeviceError = { kind: "unsupported", message: "Web Serial not supported" };
      setError(e);
      throw e;
    }
    if (phase === "connecting" || phase === "disconnecting") {
      throw new Error("另一操作正在进行中，请稍候再试");
    }

    const mySession = ++sessionRef.current;
    setError(null);
    setPhase("connecting");

    try {
      const s = await connectEKeysSerial();
      if (sessionRef.current !== mySession) {
        await s.close();
        throw new Error("连接已被新的操作取代");
      }

      // 立刻把 s 写入 serialRef，使紧随其后的 sendCmd 可以立即拿到句柄。
      // 仅靠 setSerial(s) + useEffect 同步会有一个 commit 周期时差，导致
      // 第一次 sendCmd(CMD.CONF_VERSION_GET) 命中 `s.closed` 判分支。
      serialRef.current = s;
      setSerial(s);
      setPhase("connected");

      // 0x13 TIME_SET：连接后立刻同步主机时间
      void sendTimeSet();

      // 0x01 配置版本
      const verFrame = await sendCmd<SerialFrame>(CMD.CONF_VERSION_GET);
      const verData = verFrame.data as { version?: unknown } | undefined;
      const version =
        verData && typeof verData.version === "number" ? verData.version : null;

      // 0x03 设备信息（device_info 字段在顶层）
      const infoFrame = await sendCmd<SerialFrame>(CMD.DEVICE_INFO_GET);
      const info = (infoFrame.device_info as DeviceInfo) ?? null;

      // 0x07 配置快照（已脱敏）
      const cfgFrame = await sendCmd<SerialFrame>(CMD.CONFIG_GET);
      const configRaw = (cfgFrame.data as Partial<DeviceSettings> | undefined) ?? undefined;
      const config = configRaw ? maskSensitive(configRaw as DeviceSettings) : null;

      // 0x10 Profile 状态
      const profFrame = await sendCmd<SerialFrame>(CMD.PROFILE_STATE);
      const profile = (profFrame.profile_state as ProfileState) ?? null;

      // 0x0b 固件信息（M2 新增；非阻塞失败可容忍）
      let firmwareInfo: FirmwareInfo | null = null;
      try {
        const fwFrame = await sendCmd<SerialFrame>(CMD.FIRMWARE_INFO);
        const fwData =
          (fwFrame.data as Record<string, unknown> | undefined) ??
          ((fwFrame as Record<string, unknown>).firmware as
            | Record<string, unknown>
            | undefined);
        if (fwData) {
          firmwareInfo = {
            version: String(
              fwData.version ?? fwData.firmware_version ?? fwData.fw_version ?? "",
            ),
            build_date:
              typeof fwData.build_date === "string"
                ? fwData.build_date
                : undefined,
            build_time:
              typeof fwData.build_time === "string"
                ? fwData.build_time
                : undefined,
          };
        }
      } catch {
        /* 旧固件可能不支持；不致命 */
      }

      const snap: DeviceSnapshot = {
        version,
        info,
        config,
        profile,
        firmwareInfo,
        voiceTexts: [],
      };
      setSnapshot(snap);

      // 心跳
      startHeartbeat();
      return snap;
    } catch (e) {
      const err = e instanceof Error && "kind" in e
        ? (e as unknown as DeviceError)
        : classify(e);
      if (sessionRef.current === mySession) {
        setError(err);
        setPhase("idle");
        setSerial(null);
        setSnapshot({
          version: null,
          info: null,
          config: null,
          profile: null,
          firmwareInfo: null,
          voiceTexts: [],
        });
      }
      throw err;
    }
  }, [phase, sendCmd, sendTimeSet, startHeartbeat, supported]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (phase === "idle") return;
    if (phase === "disconnecting") return;

    const mySession = ++sessionRef.current;
    setPhase("disconnecting");
    setError(null);

    const current = serial;
    // 立刻清空 ref，避免 sendQueue 中已在等待的旧句柄被使用。
    serialRef.current = null;
    setSerial(null);
    setSnapshot({
      version: null,
      info: null,
      config: null,
      profile: null,
      firmwareInfo: null,
      voiceTexts: [],
    });

    pending.current.forEach((cb) => {
      cb({ cmd: 0, seq: 0, status: 1, error: "connection closed" });
    });
    pending.current.clear();
    stopHeartbeat();

    try {
      if (current) {
        await current.close();
      }
    } catch {
      /* 串口可能已关闭，忽略 */
    } finally {
      if (sessionRef.current === mySession) {
        setPhase("idle");
      }
    }
  }, [phase, serial, stopHeartbeat]);

  /* ---------- 订阅 API ---------- */
  const onPush = useCallback(
    (handler: (frame: SerialFrame) => void): (() => void) => {
      pushSubs.current.add(handler);
      return () => {
        pushSubs.current.delete(handler);
      };
    },
    [],
  );

  const onTx = useCallback(
    (handler: (cmd: number, data?: object) => void): (() => void) => {
      txSubs.current.add(handler);
      return () => {
        txSubs.current.delete(handler);
      };
    },
    [],
  );

  const onLogLine = useCallback(
    (handler: (line: string) => void): (() => void) => {
      // 已绑定的转发链在 useEffect 中通过 serial.onLogLine 完成；
      // 这里额外维护一份订阅者集合以兼容外部直接调用。
      logSubs.current.add(handler);
      // 同步挂到 serial（若已连接）
      if (serial) {
        const off = serial.onLogLine(handler);
        return () => {
          logSubs.current.delete(handler);
          off();
        };
      }
      return () => {
        logSubs.current.delete(handler);
      };
    },
    [serial],
  );

  const onError = useCallback(
    (handler: (err: DeviceError) => void): (() => void) => {
      const wrapped = (e: { kind: string; message: string }) => {
        handler(classify(new Error(e.message), (e.kind as ErrorKind) ?? "deviceLost"));
      };
      errSubs.current.add(wrapped);
      if (serial) {
        const off = serial.onError(wrapped);
        return () => {
          errSubs.current.delete(wrapped);
          off();
        };
      }
      return () => {
        errSubs.current.delete(wrapped);
      };
    },
    [serial],
  );

  return {
    supported,
    phase,
    connected: phase === "connected",
    error,
    snapshot,
    connect,
    disconnect,
    sendCmd,
    onPush,
    onTx,
    onLogLine,
    onError,
  };
}

/** 把 frame 顶层未声明字段列表转成 i18n 友好的标签（调试辅助）。 */
export function topLevelKeysForFrame(cmd: number): ReadonlySet<string> | null {
  if (!TOP_LEVEL_CMDS.has(cmd)) return null;
  return null;
}
