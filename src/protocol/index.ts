/**
 * EKeys 协议层入口。
 * 重导出全部纯函数模块与类型，便于上层 hook / 组件 import。
 */

export { CMD, TOP_LEVEL_CMDS, IMPLEMENTED_CMDS, responseCmd, isResponse, isResponseLike } from "./commands";
export type { CmdId } from "./commands";

export { encodeLine, tryParseLine, isRespFor, isPush, isTopLevelCmd } from "./frame";
export type { Frame } from "./frame";

export { FieldMask, F, FIELD_COUNT } from "./mask";
export type { FieldName } from "./mask";

export {
  DEFAULT_SETTINGS,
  clamp,
  diff,
  apply,
  mergePush,
  maskSensitive,
  SENSITIVE_FIELDS,
} from "./settings";
export type { DeviceSettings } from "./settings";

export {
  PHYSICAL_KEY_COUNT,
  LAYER_COUNT,
  LAYER_BASE,
  LAYER_FUN1,
  LAYER_FUN2,
  LAYER_CUSTOM,
  SYNCED_LAYERS,
  PROFILE_COUNT,
  MAX_NORMAL_KEYS,
  MAX_MACRO_STEPS,
  MACRO_DEFAULT_MS,
  MACRO_MAX_MS,
  MAX_TEXT_LEN,
  FUN_KEY_MAX,
  BUILTIN_FUNCTIONS,
  emptyKeymapData,
  actionToChannel,
  channelToAction,
  parseMacroWire,
  dataToFirmwareEntries,
  buildKeymapSetPayload,
  applyFirmwareEntries,
  diffKeymap,
  syncProfileFromSettings,
  clampProfile,
  clampFunKey,
  hidLabel,
  hidWireName,
  hidWireCode,
  HID_KEY_CHOICES,
} from "./keymap";
export type {
  KeyAction,
  UnboundAction,
  KeyboardAction,
  ComboAction,
  TextAction,
  MacroAction,
  MacroStep,
  BuiltinAction,
  BuiltinFunctionName,
  LayerBinding,
  KeymapData,
  FirmwareKeyEntry,
  KeymapSnapshotMeta,
  ChannelFields,
  ProfileNameReq,
  ProfileIconReq,
  HidKeyChoice,
} from "./keymap";

export {
  AUDIO_FILE_OP,
  AUDIO_PAD_OP,
  AUDIO_FILE_MAX_BYTES,
  AUDIO_NAME_PATTERN,
  AUDIO_EXTS,
  AUDIO_CHUNK_BYTES,
  sanitizeAudioFileName,
  isAllowedAudioExt,
  indexBindingsByKey,
  emptyPadBindings,
  audioFileReq,
  audioPadReq,
} from "./audio";
export type {
  AudioFileOp,
  AudioPadOp,
  AudioExt,
  AudioFileInfo,
  AudioListResp,
  AudioBeginResp,
  AudioDataResp,
  AudioEndResp,
  AudioDeleteResp,
  AudioPadBinding,
  AudioPadGetResp,
  AudioFileReq,
  AudioFileListReq,
  AudioFileBeginReq,
  AudioFileDataReq,
  AudioFileEndReq,
  AudioFileAbortReq,
  AudioFileDeleteReq,
  AudioPadReq,
  AudioPadGetReq,
  AudioPadSetReq,
  AudioPadPlayReq,
  AudioPadStopReq,
} from "./audio";

/** 当前 Web 端实现的协议版本。 */
export const PROTOCOL_VERSION = 1;
