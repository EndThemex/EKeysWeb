/**
 * useEKeysDevice — 封装 EKeys 串口协议的命令发送与响应匹配。
 *
 * 设计要点（参考 desktop-app-protocol.md §3 与 §10.3）：
 * - 每个请求生成唯一自增 seq，并把回调挂到 pending map；
 * - 响应识别：普通命令响应 cmd = request_cmd | 0x80，且 seq 匹配；
 * - 0x10 Profile State 是当前实现的例外，cmd 仍为 0x10，profile_state 位于顶层；
 * - 当前仅实现读取类命令：0x01 / 0x03 / 0x05 / 0x07 / 0x10。
 *
 * 连接生命周期用 phase 描述，避免 UI 与底层资源释放出现竞态：
 *   idle → connecting → connected → disconnecting → idle
 *                         ↑               │
 *                         └───── 失败 ────┘
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectEKeysSerial,
  isWebSerialSupported,
  type EKeysSerial,
  type SerialFrame,
} from "./useSerial";

/** 协议命令 ID（参见 desktop-app-protocol.md §4）。 */
export const CMD = {
  CONF_VERSION_GET: 0x01,
  DEVICE_INFO_GET: 0x03,
  KEYMAP_GET: 0x05,
  CONFIG_GET: 0x07,
  PROFILE_STATE: 0x10,
} as const;

export interface DeviceInfo {
  device_name: string;
  device_id: string;
  firmware_version: string;
}

export interface DeviceConfig {
  wifi_switch: number;
  connect_host: number;
  wifi_ssid: string;
  wifi_password?: string;
  work_mode: number;
  rgb_mode: number;
  rgb_single_color?: number;
  rgb_click_mode?: number;
  rgb_brightness: number;
  tft_theme?: number;
  tft_brightness: number;
  device_volume: number;
  audio_enable: number;
  power_mode: number;
  voice_enable: number;
  voice_trigger_key: number;
  voice_max_record_ms?: number;
  voice_auto_enter?: number;
  pc_status_mask?: number;
  active_keymap_profile: number;
  active_profile_name: string;
  active_profile_has_custom_icon: boolean;
}

export interface ProfileState {
  active_profile: number;
  profile_number: number;
  profile_name: string;
  has_custom_icon: boolean;
  icon_path: string;
}

export interface DeviceSnapshot {
  version: number | null;
  info: DeviceInfo | null;
  config: DeviceConfig | null;
  profile: ProfileState | null;
}

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
  | "unknown";

export interface DeviceError {
  kind: ErrorKind;
  message: string;
}

const REQUEST_TIMEOUT_MS = 3000;

/** 把浏览器抛出的 Error 归类成 ErrorKind。 */
function classify(err: unknown, fallbackKind: ErrorKind = "unknown"): DeviceError {
  const raw = err instanceof Error ? err.message : String(err);

  if (/could not open port|already open|port is in use|Failed to open/i.test(raw)) {
    return { kind: "portBusy", message: raw };
  }
  if (/No port selected|user (did not|cancelled|didn't) (choose|select)/i.test(raw)) {
    return { kind: "userCancelled", message: raw };
  }
  if (/No matching devices|No devices found/i.test(raw)) {
    return { kind: "noPort", message: raw };
  }
  if (/NetworkError|Failed to (read|write)|stream has been aborted/i.test(raw)) {
    return { kind: "writeFailed", message: raw };
  }
  if (/超时|timeout/i.test(raw)) {
    return { kind: "timeout", message: raw };
  }
  if (/status.*[=:]\s*1|json parse error|unknown command|missing 'cmd'/i.test(raw)) {
    return { kind: "protocol", message: raw };
  }
  return { kind: fallbackKind, message: raw };
}

function isRespFor(reqCmd: number, frame: SerialFrame): boolean {
  const cmd = frame.cmd as number | undefined;
  return typeof cmd === "number" && cmd === (reqCmd | 0x80);
}

export function useEKeysDevice() {
  const [serial, setSerial] = useState<EKeysSerial | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<DeviceError | null>(null);
  const supported = isWebSerialSupported();

  const seqRef = useRef(1);
  const pending = useRef(new Map<number, (f: SerialFrame) => void>());
  // 标记当前 session token，用于丢弃上一次未完成的 connect/disconnect。
  const sessionRef = useRef(0);

  // 订阅帧：按 cmd/seq 分发到等待队列
  useEffect(() => {
    if (!serial) return;
    const off = serial.onFrame((frame) => {
      const cmd = frame.cmd as number | undefined;
      const seq = (frame.seq as number) ?? 0;

      // 0x10 例外：profile_state 在顶层
      if (cmd === CMD.PROFILE_STATE && "profile_state" in frame) {
        const cb = pending.current.get(seq);
        if (cb) {
          pending.current.delete(seq);
          cb(frame);
        }
        return;
      }

      if (typeof cmd === "number" && (cmd & 0x80) !== 0 && seq !== 0) {
        const cb = pending.current.get(seq);
        if (cb) {
          pending.current.delete(seq);
          cb(frame);
        }
      }
      // seq=0 主动帧（0x87 / 0x0C / …）当前任务不处理
    });
    return () => {
      off();
    };
  }, [serial]);

  /** 内部通用：发送一条命令并等待响应。 */
  const sendCmd = useCallback(
    async <T extends SerialFrame>(s: EKeysSerial, cmd: number, data?: object): Promise<T> => {
      const seq = seqRef.current++;
      const payload =
        JSON.stringify({ cmd, seq, ...(data ? { data } : {}) }) + "\n";

      return new Promise<T>(async (resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          pending.current.delete(seq);
          clearTimeout(timer);
          fn();
        };

        const timer = setTimeout(() => {
          finish(() =>
            reject(classify(new Error(`请求超时：cmd=0x${cmd.toString(16)} seq=${seq}`), "timeout")),
          );
        }, REQUEST_TIMEOUT_MS);

        pending.current.set(seq, (frame) => {
          // 0x10 例外已在 onFrame 中处理；其余只接受对应响应 cmd。
          if (cmd === CMD.PROFILE_STATE) {
            if (frame.cmd === CMD.PROFILE_STATE && "profile_state" in frame) {
              finish(() => resolve(frame as T));
            }
            return;
          }
          if (!isRespFor(cmd, frame)) return;
          // status != 0 时把协议错误冒泡
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

        try {
          await s.write(payload);
        } catch (e) {
          finish(() => reject(classify(e, "writeFailed")));
        }
      });
    },
    [],
  );

  /** 连接并拉取首屏全部快照。 */
  const connect = useCallback(async (): Promise<DeviceSnapshot> => {
    if (!supported) {
      const e: DeviceError = { kind: "unsupported", message: "Web Serial not supported" };
      setError(e);
      throw e;
    }
    // 互斥：上一次 disconnecting 还没结束，就不允许新连接
    if (phase === "connecting" || phase === "disconnecting") {
      throw new Error("另一操作正在进行中，请稍候再试");
    }

    const mySession = ++sessionRef.current;
    setError(null);
    setPhase("connecting");

    try {
      const s = await connectEKeysSerial();
      // 用户在选择设备弹窗中按了 Cancel，会走到 catch
      if (sessionRef.current !== mySession) {
        // 已被新操作抢占，丢弃本次连接
        await s.close();
        throw new Error("连接已被新的操作取代");
      }

      setSerial(s);
      setPhase("connected");

      // 0x01 配置版本
      const verFrame = await sendCmd<SerialFrame>(s, CMD.CONF_VERSION_GET);
      const verData = verFrame.data as { version?: unknown } | undefined;
      const version =
        verData && typeof verData.version === "number" ? verData.version : null;

      // 0x03 设备信息
      const infoFrame = await sendCmd<SerialFrame>(s, CMD.DEVICE_INFO_GET);
      const info = (infoFrame.device_info as DeviceInfo) ?? null;

      // 0x07 配置快照
      const cfgFrame = await sendCmd<SerialFrame>(s, CMD.CONFIG_GET);
      const config = (cfgFrame.data as DeviceConfig) ?? null;

      // 0x10 Profile 状态
      const profFrame = await sendCmd<SerialFrame>(s, CMD.PROFILE_STATE);
      const profile = (profFrame.profile_state as ProfileState) ?? null;

      return { version, info, config, profile };
    } catch (e) {
      const err = e instanceof Error && "kind" in e
        ? (e as unknown as DeviceError)
        : classify(e);
      if (sessionRef.current === mySession) {
        setError(err);
        setPhase("idle");
        setSerial(null);
      }
      throw err;
    }
  }, [phase, sendCmd, supported]);

  /**
   * 断开连接。必须 await 完成才能再次 connect，
   * 否则上一次 port.close() 未完成时新一次 port.open() 会被浏览器拒绝。
   */
  const disconnect = useCallback(async (): Promise<void> => {
    if (phase === "idle") return;
    if (phase === "disconnecting") return;

    const mySession = ++sessionRef.current;
    setPhase("disconnecting");
    setError(null);

    const current = serial;
    // 立刻清空订阅，避免后续帧继续派发
    setSerial(null);

    // 取消所有挂起的请求
    pending.current.forEach((cb) => {
      cb({ cmd: 0, seq: 0, status: 1, error: "connection closed" });
    });
    pending.current.clear();

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
  }, [phase, serial]);

  return {
    supported,
    phase,
    connected: phase === "connected",
    error,
    connect,
    disconnect,
  };
}