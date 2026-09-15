/**
 * EKeys 协议层 —— 22 条命令常量。
 *
 * 与 EKeysApp/src/protocol.rs 中的 CMD_* 一一对应；
 * Web 端下发的所有 cmd 字段必须从此处取值，禁止使用裸数字。
 */

export const CMD = {
  CONF_VERSION_GET: 0x01,
  CONF_VERSION_SET: 0x02,
  DEVICE_INFO_GET: 0x03,
  DEVICE_INFO_SET: 0x04,
  KEYMAP_GET: 0x05,
  KEYMAP_SET: 0x06,
  CONFIG_GET: 0x07,
  CONFIG_SET: 0x08,
  KEY_EVENT: 0x09,
  HEARTBEAT: 0x0a,
  FIRMWARE_INFO: 0x0b,
  VOICE_TEXT: 0x0c,
  PC_STATUS: 0x0d,
  MUSIC_STATUS: 0x0e,
  MUSIC_CONTROL: 0x0f,
  PROFILE_STATE: 0x10,
  PROFILE_ICON_SET: 0x11,
  HA_STATUS: 0x12,
  TIME_SET: 0x13,
  FIRMWARE_DOWNLOAD: 0x14,
  PROFILE_NAME_SET: 0x15,
  AUDIO_FILE: 0x16,
  AUDIO_PAD: 0x17,
} as const;

export type CmdId = (typeof CMD)[keyof typeof CMD];

/** 把请求 cmd 转换成对应响应 cmd（bit7 置 1）。 */
export const responseCmd = (req: number): number => req | 0x80;

/** 是否是「带响应的命令」（bit7 == 1）。 */
export const isResponse = (cmd: number): boolean => (cmd & 0x80) !== 0;

/**
 * 响应匹配口径：
 * - 普通响应：bit7 = 1 且 seq != 0（请求-响应配对）
 * - 例外：PROFILE_STATE 的 cmd 仍为 0x10，profile_state 字段位于顶层
 * - 主动推送：bit7 = 1 且 seq == 0，由 useEKeysDevice.onPush 路由
 */
export const isResponseLike = (cmd: number): boolean =>
  isResponse(cmd) || cmd === CMD.PROFILE_STATE;

/**
 * 顶层命令：响应或推送帧的 body 不在 `data` 字段而在顶层。
 * 用于 useEKeysDevice.handleFrame 决定去哪儿读 payload。
 */
export const TOP_LEVEL_CMDS: ReadonlySet<number> = new Set<number>([
  CMD.VOICE_TEXT,
  CMD.PROFILE_STATE,
  CMD.MUSIC_CONTROL,
]);

/** 当前 Web 端已实现的命令 ID 集合（M1 + M2 + M3）。 */
export const IMPLEMENTED_CMDS: ReadonlySet<number> = new Set<number>([
  CMD.CONF_VERSION_GET,
  CMD.CONF_VERSION_SET,
  CMD.DEVICE_INFO_GET,
  CMD.DEVICE_INFO_SET,
  CMD.KEYMAP_GET,
  CMD.KEYMAP_SET,
  CMD.CONFIG_GET,
  CMD.CONFIG_SET,
  CMD.HEARTBEAT,
  CMD.FIRMWARE_INFO,
  CMD.VOICE_TEXT,
  CMD.PC_STATUS,
  CMD.PROFILE_STATE,
  CMD.PROFILE_ICON_SET,
  CMD.TIME_SET,
  CMD.PROFILE_NAME_SET,
  CMD.MUSIC_STATUS,
  CMD.MUSIC_CONTROL,
]);
