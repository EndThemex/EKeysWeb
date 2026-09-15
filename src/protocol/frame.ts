/**
 * EKeys 协议层 —— 帧编解码与判定。
 *
 * 单行 JSON，cmd 高位表示「需要回复」，seq = 0 表示设备主动推送。
 */

import { CMD } from "./commands";

/** 通用 JSON 帧：来自串口的每一个被 tryParseLine 解析后的对象。 */
export interface Frame {
  cmd: number;
  seq: number;
  data?: unknown;
  /** 响应专用：0 = 成功，1 = 失败。 */
  status?: number;
  /** 响应专用：status = 1 时附带的错误信息。 */
  error?: string;
  /** 顶层未声明字段（如 0x05 的 `keymap`、`0x10` 的 `profile_state`、`0x03` 的 `device_info`）。 */
  [k: string]: unknown;
}

/** 把 frame 序列化为单行 JSON，并在末尾追加 `\n`。 */
export function encodeLine(frame: Frame | Record<string, unknown>): string {
  return JSON.stringify(frame) + "\n";
}

/**
 * 尝试把一行字符串解析为 Frame：
 * - 非 JSON（不 `{` 开头）返回 null；
 * - JSON 但缺少 `cmd` / `seq` 也返回 null；
 * - 解析异常返回 null。
 */
export function tryParseLine(line: string): Frame | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const cmd = typeof obj.cmd === "number" ? obj.cmd : null;
    const seq = typeof obj.seq === "number" ? obj.seq : null;
    if (cmd === null || seq === null) return null;
    return obj as Frame;
  } catch {
    return null;
  }
}

/** 响应匹配：cmd 等于请求 cmd | 0x80。接受任意 cmd/seq 字段的对象。 */
export const isRespFor = (
  reqCmd: number,
  frame: { cmd?: unknown; seq?: unknown },
): boolean => typeof frame.cmd === "number" && frame.cmd === (reqCmd | 0x80);

/** 推送帧：bit7 = 1 且 seq = 0。 */
export const isPush = (frame: Frame): boolean =>
  (frame.cmd & 0x80) !== 0 && frame.seq === 0;

/** 顶层命令：payload 在 frame 顶层而非 frame.data。 */
export const isTopLevelCmd = (cmd: number): boolean =>
  cmd === CMD.PROFILE_STATE ||
  cmd === CMD.VOICE_TEXT ||
  cmd === CMD.MUSIC_CONTROL;
