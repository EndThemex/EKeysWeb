/**
 * EKeys 协议层 —— 键映射（Keymap）。
 *
 * 与固件 src/protocol/commands/cmd_keymap.cpp + src/utils/keymap_types.h 对齐
 * （2026-10 协议：宏序列 + 文本注入 + FUN 组合层）：
 *
 * wire 模型（每物理键，全部字段可选，缺省 = 不修改 / 空 = 清除）：
 * - normal          "+" 分隔的键名序列（最多 6），支持修饰键组合 "Ctrl+c"
 * - macro           宏序列，最多 5 步 "键名[:间隔ms]"（仅单击层，默认 20ms，clamp 0~60000）
 * - text            文本注入串（ASCII ≤128）
 * - function        固件内建功能串（KEY_FUNCTION_ASR / KEY_FUNCTION_PAGE_*）
 * - combo1_*        FUN1 按住时的组合层通道（无宏通道）
 * - combo2_*        FUN2 按住时的组合层通道（无宏通道）
 *
 * 通道优先级：function > text > normal / macro（组合层内 function > text > normal）。
 * 键名解析（固件 KeyNameTable.cpp）：a-z / 0-9 / Enter / Backspace / Space /
 * Ctrl|Control / Shift / Alt|Option / Win|GUI + `0xNN`（hex HID）。
 * ⚠️ 固件不解析 "Tab" / "Esc" 等扩展键名 —— 与 App 端一致，**下发一律用
 * `0xNN` 字面量**（固件可无损解析），具名键仅用于 UI 展示（hidLabel）。
 * 单个大写字母自动附带 Shift（仅宏步骤编码使用，如 "A" → Shift+A）。
 *
 * Web 层映射：
 * - layer 0 (Base)   ↔ normal / macro / text / function
 * - layer 1 (Fun 1)  ↔ combo1_*
 * - layer 2 (Fun 2)  ↔ combo2_*
 * - layer 3 (Custom) 仅本地占位，不参与同步
 * - fun_key1 / fun_key2（FUN 修饰键位，0~11，0=未配置）在 0x05/0x06 帧顶层
 */

import type { DeviceSettings } from "./settings";

/* ============================================================
 * 常量
 * ============================================================ */

/** 物理按键数（11 键，跳过 encoder 槽）。 */
export const PHYSICAL_KEY_COUNT = 11;

/** 4 个 layer（0=Base，1=FUN1，2=FUN2，3=Custom 占位）。 */
export const LAYER_COUNT = 4;

export const LAYER_BASE = 0;
export const LAYER_FUN1 = 1;
export const LAYER_FUN2 = 2;
export const LAYER_CUSTOM = 3;

/** 参与协议同步的 layer（Custom 仅本地占位）。 */
export const SYNCED_LAYERS: readonly number[] = [
  LAYER_BASE,
  LAYER_FUN1,
  LAYER_FUN2,
];

/** Profile 数（与 DeviceSettings.active_keymap_profile 槽数对齐：0..7）。 */
export const PROFILE_COUNT = 8;

/** normal 通道最多键数（固件 kKeyMappingNormalCount）。 */
export const MAX_NORMAL_KEYS = 6;

/** 宏序列最多步数（固件 kKeyMappingMacrosCount）。 */
export const MAX_MACRO_STEPS = 5;

/** 宏步骤默认间隔（固件 kMacroStepDefaultMs）。 */
export const MACRO_DEFAULT_MS = 20;

/** 宏步骤间隔上限（固件 kMacroStepMaxMs）。 */
export const MACRO_MAX_MS = 60000;

/** text 通道长度上限（ASCII 字符数，固件 kMaxTextLen）。 */
export const MAX_TEXT_LEN = 128;

/** fun_key 取值范围（0~11，0 = 未配置）。 */
export const FUN_KEY_MIN = 0;
export const FUN_KEY_MAX = PHYSICAL_KEY_COUNT;

/** 固件内建功能串（MainTask::functionKeyJumpTarget / KeyEventDispatcher）。 */
export const BUILTIN_FUNCTIONS = [
  "KEY_FUNCTION_ASR",
  "KEY_FUNCTION_PAGE_PC",
  "KEY_FUNCTION_PAGE_MUSIC",
  "KEY_FUNCTION_PAGE_AUDIO",
  "KEY_FUNCTION_PAGE_KEYMAP",
  "KEY_FUNCTION_PAGE_SETTING",
  "KEY_FUNCTION_PAGE_HA",
] as const;

export type BuiltinFunctionName = (typeof BUILTIN_FUNCTIONS)[number];

/* ============================================================
 * KeyAction —— 用户层语义模型
 * ============================================================ */

/** 未绑定（默认）。 */
export interface UnboundAction {
  kind: "unbound";
}

/** 单个键盘按键（HID usage code）。 */
export interface KeyboardAction {
  kind: "keyboard";
  /** USB HID keyboard usage id（与 HIDKeyChoices 一致）。 */
  code: number;
}

/** 多键组合（"Ctrl+c" / "a+b"：同时按下；固件 normal "+" 序列）。 */
export interface ComboAction {
  kind: "combo";
  /** HID usage id 序列（≤ MAX_NORMAL_KEYS），按 wire 顺序。 */
  codes: number[];
}

/** 文本注入（ASCII ≤128；按键触发整串输出一次）。 */
export interface TextAction {
  kind: "text";
  text: string;
}

/** 宏步骤：按下→间隔→释放。 */
export interface MacroStep {
  /** USB HID usage id。 */
  code: number;
  /** 附带 Shift（仅字母键 0x04~0x1D 有意义；编码为大写字母名）。 */
  shift?: boolean;
  /** 释放后到下一步的间隔（ms，0~60000）。 */
  delayMs: number;
}

/** 步进宏（仅单击层；组合层无宏通道）。 */
export interface MacroAction {
  kind: "macro";
  steps: MacroStep[]; // ≤ MAX_MACRO_STEPS
}

/**
 * 固件 function 通道动作。
 *
 * 已知内建功能串（BUILTIN_FUNCTIONS）在 UI 提供下拉选择；其它任意字符串
 * 原样透传保留（与 App 端 `KeyAction::Function(String)` 一致）：固件不解析
 * 的串按键无效，但 GET → 应用 → SET 往返不会静默清掉设备上的配置。
 */
export interface BuiltinAction {
  kind: "builtin";
  /** 固件功能串原文（内建名或未识别串）。 */
  name: string;
}

export type KeyAction =
  | UnboundAction
  | KeyboardAction
  | ComboAction
  | TextAction
  | MacroAction
  | BuiltinAction;

/* ============================================================
 * FirmwareKeyEntry —— 协议层 wire 模型
 * ============================================================ */

/**
 * 0x05 / 0x06 keymap 数组中的一项。
 * 所有字段可选：undefined = 不修改；"" = 显式清除。
 */
export interface FirmwareKeyEntry {
  physical: number; // 1..11
  normal?: string;
  macro?: string;
  text?: string;
  function?: string;
  combo1_normal?: string;
  combo1_text?: string;
  combo1_function?: string;
  combo2_normal?: string;
  combo2_text?: string;
  combo2_function?: string;
}

/**
 * 0x05 响应顶层元信息 / 0x06 请求可选字段：
 * - profile：0x05 响应带实际返回的 profile（支持 data.profile 定向拉取）
 * - fun_key1 / fun_key2：FUN 修饰键位（0~11，0 = 未配置）
 */
export interface KeymapSnapshotMeta {
  profile?: number;
  funKey1?: number;
  funKey2?: number;
}

/* ============================================================
 * KeymapData —— 当前激活 Profile 的 4 层键映射
 * ============================================================ */

/** 一层 11 键绑定。 */
export interface LayerBinding {
  slots: KeyAction[]; // 长度 = PHYSICAL_KEY_COUNT
}

/**
 * 整个 Keymap 数据快照：
 * - profile：当前编辑哪个 Profile（0..7）
 * - profile_name / has_custom_icon：仅展示用，UI 写走 0x15 / 0x11
 * - funKey1 / funKey2：FUN 修饰键位（1..11；0 = 未配置）
 * - layers：4 层 × 11 键；layer 0/1/2 参与同步，3 仅占位
 */
export interface KeymapData {
  profiles: number; // 1..8
  activeProfile: number; // 0..7
  funKey1: number; // 0..11
  funKey2: number; // 0..11
  layers: LayerBinding[]; // 长度 = LAYER_COUNT * PHYSICAL_KEY_COUNT（layers[i * 11 + k]）
  profileName: string;
  hasCustomIcon: boolean;
}

/** 新建一个空的 KeymapData（全 unbound）。 */
export function emptyKeymapData(): KeymapData {
  const layers: LayerBinding[] = [];
  for (let l = 0; l < LAYER_COUNT; l++) {
    const slots: KeyAction[] = [];
    for (let k = 0; k < PHYSICAL_KEY_COUNT; k++) {
      slots.push({ kind: "unbound" });
    }
    layers.push({ slots });
  }
  return {
    profiles: PROFILE_COUNT,
    activeProfile: 0,
    funKey1: 0,
    funKey2: 0,
    layers,
    profileName: "",
    hasCustomIcon: false,
  };
}

/* ============================================================
 * 键名 ↔ HID code
 * ============================================================ */

/** USB HID usage id → 友好显示名；不在表内返回 null。 */
export function hidLabel(code: number): string | null {
  if (code in HID_ALPHA) return HID_ALPHA[code];
  if (code in HID_DIGIT) return HID_DIGIT[code];
  if (code in HID_SPECIAL) return HID_SPECIAL[code];
  return null;
}

/** HID usage id → 固件 wire 段名；非修饰键一律 `0xNN` 字面量（无损解析）。 */
export function hidWireName(code: number): string {
  if (code in HID_MODIFIER) return HID_MODIFIER[code];
  return `0x${code.toString(16).padStart(2, "0")}`;
}

/** 固件 wire 键名 → HID usage id；不可解析返回 null。 */
export function hidWireCode(name: string): number | null {
  const lower = name.toLowerCase();
  if (lower in HID_MODIFIER_INV) return HID_MODIFIER_INV[lower];
  if (lower in HID_ALPHA_INV) return HID_ALPHA_INV[lower];
  if (lower in HID_DIGIT_INV) return HID_DIGIT_INV[lower];
  if (lower in HID_SPECIAL_INV) return HID_SPECIAL_INV[lower];
  if (/^0x[0-9a-fA-F]{1,2}$/.test(name)) return parseInt(name.slice(2), 16);
  return null;
}

const HID_ALPHA: Record<number, string> = {
  0x04: "a", 0x05: "b", 0x06: "c", 0x07: "d", 0x08: "e", 0x09: "f",
  0x0a: "g", 0x0b: "h", 0x0c: "i", 0x0d: "j", 0x0e: "k", 0x0f: "l",
  0x10: "m", 0x11: "n", 0x12: "o", 0x13: "p", 0x14: "q", 0x15: "r",
  0x16: "s", 0x17: "t", 0x18: "u", 0x19: "v", 0x1a: "w", 0x1b: "x",
  0x1c: "y", 0x1d: "z",
};
const HID_DIGIT: Record<number, string> = {
  0x1e: "1", 0x1f: "2", 0x20: "3", 0x21: "4", 0x22: "5",
  0x23: "6", 0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",
};
const HID_SPECIAL: Record<number, string> = {
  0x28: "Enter", 0x2a: "Backspace", 0x2c: "Space",
  0x2b: "Tab", 0x29: "Esc",
};
/** 修饰键名（固件 KeyNameTable 约定别名取正式名）。 */
const HID_MODIFIER: Record<number, string> = {
  0xe0: "Ctrl", 0xe1: "Shift", 0xe2: "Alt", 0xe3: "Win",
};

const HID_ALPHA_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_ALPHA).map(([k, v]) => [v, parseInt(k, 10)]),
);
const HID_DIGIT_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_DIGIT).map(([k, v]) => [v, parseInt(k, 10)]),
);
const HID_SPECIAL_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_SPECIAL).map(([k, v]) => [v, parseInt(k, 10)]),
);
const HID_MODIFIER_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_MODIFIER).map(([k, v]) => [v.toLowerCase(), parseInt(k, 10)]),
);

/* ============================================================
 * 单通道编码 / 解码（base 层含 macro；combo 层无 macro）
 * ============================================================ */

/** 单层通道字段（undefined = 缺省不修改；"" = 显式清除）。 */
export interface ChannelFields {
  normal?: string;
  macro?: string;
  text?: string;
  function?: string;
}

/** 把 KeyAction 编码为单层通道字段。 */
export function actionToChannel(a: KeyAction, allowMacro: boolean): ChannelFields {
  switch (a.kind) {
    case "unbound":
      return {};
    case "keyboard": {
      // 修饰键单独成键用键名；其余 0xNN 字面量（固件 KeyNameTable 可无损解析）
      return { normal: hidWireName(a.code) };
    }
    case "combo": {
      const names = a.codes
        .slice(0, MAX_NORMAL_KEYS)
        .map((c) => hidWireName(c));
      return { normal: names.join("+") };
    }
    case "text":
      // 与 App 端一致：原样透传（固件按 UTF-8 存储、截断到 128 字节；
      // 非 ASCII 字符 HID 无法输出，UI 层负责警告，不做静默剔除）
      return { text: a.text };
    case "macro": {
      if (!allowMacro || a.steps.length === 0) return {};
      const parts = a.steps.slice(0, MAX_MACRO_STEPS).map((s) => {
        // Shift+字母编码为大写字母名（固件 resolveKeyWithModifier 自动附 Shift）
        const name =
          s.shift && s.code >= 0x04 && s.code <= 0x1d
            ? String.fromCharCode(65 + (s.code - 0x04))
            : hidWireName(s.code);
        const delay = Math.max(0, Math.min(MACRO_MAX_MS, Math.trunc(s.delayMs) || 0));
        return delay === MACRO_DEFAULT_MS ? name : `${name}:${delay}`;
      });
      return { macro: parts.join("+") };
    }
    case "builtin":
      return { function: a.name };
  }
}

/** 解析单个 wire 段：单大写字母 → 附 Shift；其余走 hidWireCode。 */
function parseWireSegment(seg: string): { code: number; shift: boolean } | null {
  const s = seg.trim();
  if (s.length === 1 && s >= "A" && s <= "Z") {
    return { code: 0x04 + (s.charCodeAt(0) - 65), shift: true };
  }
  const code = hidWireCode(s);
  return code !== null ? { code, shift: false } : null;
}

/**
 * 把单层通道字段解码回 KeyAction。
 * 优先级与固件一致：function > text > normal > macro；
 * 无法识别的内容原样落入 function 透传（{kind:"builtin", name: 原串}），
 * 保证 GET → 应用 → SET 往返不会静默清掉设备上不认识的配置（与 App 端一致）。
 */
export function channelToAction(
  ch: ChannelFields,
  allowMacro: boolean,
): KeyAction {
  const fn = ch.function?.trim() ?? "";
  if (fn) return { kind: "builtin", name: fn };

  const text = ch.text ?? "";
  if (text) return { kind: "text", text };

  const normal = ch.normal?.trim() ?? "";
  if (normal) return normalToAction(normal);

  const macro = ch.macro?.trim() ?? "";
  if (macro && allowMacro) {
    const steps = parseMacroWire(macro);
    if (steps) return { kind: "macro", steps };
    // 畸形宏串原样保留（透传到 function 通道，与 App 端 parse_macro_string 一致）
    return { kind: "builtin", name: macro };
  }

  return { kind: "unbound" };
}

/** 解析宏 wire 串："A:20+0x2c" → MacroStep[]；非法返回 null。 */
export function parseMacroWire(wire: string): MacroStep[] | null {
  const parts = wire.split("+");
  if (parts.length === 0 || parts.length > MAX_MACRO_STEPS) return null;
  const steps: MacroStep[] = [];
  for (const part of parts) {
    if (!part) return null;
    const colon = part.lastIndexOf(":");
    const nameRaw = colon > 0 ? part.slice(0, colon) : part;
    let delayMs = MACRO_DEFAULT_MS;
    if (colon > 0) {
      const msRaw = part.slice(colon + 1);
      if (msRaw === "") {
        delayMs = MACRO_DEFAULT_MS;
      } else {
        const ms = Number(msRaw);
        if (!Number.isInteger(ms) || ms < 0 || ms > MACRO_MAX_MS) return null;
        delayMs = ms;
      }
    }
    const seg = parseWireSegment(nameRaw);
    if (!seg) return null;
    steps.push({ code: seg.code, shift: seg.shift, delayMs });
  }
  return steps;
}

/** 解析 normal 通道："Ctrl+0x06" / "a+0x04" / "0x04" / "Ctrl"（修饰键单独成键）。 */
function normalToAction(normal: string): KeyAction {
  const wire = normal.trim();
  if (!wire) return { kind: "unbound" };
  if (!wire.includes("+")) {
    const seg = parseWireSegment(wire);
    if (!seg) return { kind: "builtin", name: wire };
    // 单大写字母在 normal 通道 = Shift+字母（固件 resolveSingleSegment）
    if (seg.shift) return { kind: "combo", codes: [0xe1, seg.code] };
    return { kind: "keyboard", code: seg.code };
  }
  const codes: number[] = [];
  for (const token of wire.split("+")) {
    const seg = parseWireSegment(token);
    if (!seg) return { kind: "builtin", name: wire };
    codes.push(seg.code);
  }
  return { kind: "combo", codes };
}

/* ============================================================
 * KeymapData ↔ FirmwareKeyEntry[]
 * ============================================================ */

/** layer 索引 → combo 前缀（"" / "combo1" / "combo2"）。 */
function comboPrefix(layer: number): "" | "combo1" | "combo2" {
  if (layer === LAYER_FUN1) return "combo1";
  if (layer === LAYER_FUN2) return "combo2";
  return "";
}

/** 从 entry 读取指定 layer 的通道字段。 */
function entryChannel(e: FirmwareKeyEntry, layer: number): ChannelFields {
  if (layer === LAYER_BASE) {
    return { normal: e.normal, macro: e.macro, text: e.text, function: e.function };
  }
  const prefix = comboPrefix(layer);
  return {
    normal: prefix === "combo1" ? e.combo1_normal : e.combo2_normal,
    text: prefix === "combo1" ? e.combo1_text : e.combo2_text,
    function: prefix === "combo1" ? e.combo1_function : e.combo2_function,
  };
}

/**
 * 把通道字段写入 entry 的指定 layer；空串跳过（不输出字段）。
 *
 * 固件 0x06 行缓冲上限 2048 字节（SerialProtocol kLineBufferSize），
 * 超限整行丢弃且无错误响应 → Web 侧只会看到超时。与 App 端
 * `skip_serializing_if = "String::is_empty"` 对齐；SET 路径每个 entry
 * 用全新 KeyMapping 覆盖该键，字段缺失与空串语义等价（= 清除）。
 */
function setEntryChannel(e: FirmwareKeyEntry, layer: number, ch: ChannelFields): void {
  if (layer === LAYER_BASE) {
    e.normal = ch.normal || undefined;
    e.macro = ch.macro || undefined;
    e.text = ch.text || undefined;
    e.function = ch.function || undefined;
    return;
  }
  if (layer === LAYER_FUN1) {
    e.combo1_normal = ch.normal || undefined;
    e.combo1_text = ch.text || undefined;
    e.combo1_function = ch.function || undefined;
  } else {
    e.combo2_normal = ch.normal || undefined;
    e.combo2_text = ch.text || undefined;
    e.combo2_function = ch.function || undefined;
  }
}

/** 为指定物理键（1 基）构建 entry，覆盖 Base / FUN1 / FUN2 三层。 */
function entriesForKeys(d: KeymapData, physicals: number[]): FirmwareKeyEntry[] {
  return physicals.map((physical) => {
    const entry: FirmwareKeyEntry = { physical };
    for (const layer of SYNCED_LAYERS) {
      const a = d.layers[layer]?.slots[physical - 1] ?? { kind: "unbound" };
      setEntryChannel(entry, layer, actionToChannel(a, layer === LAYER_BASE));
    }
    return entry;
  });
}

/**
 * 把 draft 的 Base / FUN1 / FUN2 三层编码为 0x06 keymap 数组（全 11 键）。
 * 未绑定的通道不出现在 JSON 里（缺省 = 清除，见 setEntryChannel 注释）。
 */
export function dataToFirmwareEntries(d: KeymapData): FirmwareKeyEntry[] {
  return entriesForKeys(
    d,
    Array.from({ length: PHYSICAL_KEY_COUNT }, (_, i) => i + 1),
  );
}

/**
 * 构建 0x06 请求 data（与 App 端 to_firmware_entries 行为一致）：
 * - keymap：全 11 键整表，空通道不出现在 JSON（缺省 = 清除）
 * - fun_key1 / fun_key2：仅在与 snapshot 不同时携带（缺省 = 保持现值）
 */
export function buildKeymapSetPayload(
  draft: KeymapData,
  snapshot: KeymapData | null,
): { keymap: FirmwareKeyEntry[]; fun_key1?: number; fun_key2?: number } {
  const payload: ReturnType<typeof buildKeymapSetPayload> = {
    keymap: dataToFirmwareEntries(draft),
  };
  if (!snapshot || draft.funKey1 !== snapshot.funKey1) {
    payload.fun_key1 = clampFunKey(draft.funKey1);
  }
  if (!snapshot || draft.funKey2 !== snapshot.funKey2) {
    payload.fun_key2 = clampFunKey(draft.funKey2);
  }
  return payload;
}

/** 把固件返回的 entry 列表（+ 顶层元信息）写回 KeymapData。 */
export function applyFirmwareEntries(
  d: KeymapData,
  entries: FirmwareKeyEntry[],
  meta?: KeymapSnapshotMeta,
): KeymapData {
  const layers = d.layers.map((l, idx) =>
    idx === LAYER_CUSTOM
      ? l
      : {
          slots: Array.from({ length: PHYSICAL_KEY_COUNT }, (_, i) => {
            const e = entries[i];
            if (!e) return { kind: "unbound" } as KeyAction;
            const ch = entryChannel(e, idx);
            return channelToAction(ch, idx === LAYER_BASE);
          }),
        },
  );
  const next: KeymapData = {
    ...d,
    layers,
    funKey1: clampFunKey(meta?.funKey1 ?? d.funKey1),
    funKey2: clampFunKey(meta?.funKey2 ?? d.funKey2),
    activeProfile: clampProfile(meta?.profile ?? d.activeProfile),
  };
  return next;
}

/**
 * 计算 draft 与 snapshot 的差异（layer 0/1/2 + fun keys），
 * 返回被修改的 (layer, physical) 与 fun key 变更标记。
 */
export function diffKeymap(
  draft: KeymapData,
  snapshot: KeymapData,
): {
  physical: number[];
  layers: Record<number, number[]>;
  funKeysChanged: boolean;
  changed: boolean;
} {
  const layers: Record<number, number[]> = {};
  for (const layer of SYNCED_LAYERS) {
    const dr = draft.layers[layer]?.slots ?? [];
    const sr = snapshot.layers[layer]?.slots ?? [];
    const idxs: number[] = [];
    for (let i = 0; i < PHYSICAL_KEY_COUNT; i++) {
      if (!actionsEqual(dr[i], sr[i])) idxs.push(i + 1);
    }
    if (idxs.length > 0) layers[layer] = idxs;
  }
  const funKeysChanged =
    draft.funKey1 !== snapshot.funKey1 || draft.funKey2 !== snapshot.funKey2;
  return {
    physical: [...new Set(Object.values(layers).flat())],
    layers,
    funKeysChanged,
    changed: Object.keys(layers).length > 0 || funKeysChanged,
  };
}

function actionsEqual(a: KeyAction | undefined, b: KeyAction | undefined): boolean {
  if (!a || !b) return (a ?? null) === (b ?? null);
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "unbound":
      return true;
    case "keyboard":
      return b.kind === "keyboard" && b.code === a.code;
    case "text":
      return b.kind === "text" && b.text === a.text;
    case "builtin":
      return b.kind === "builtin" && b.name === a.name;
    case "combo":
      return (
        b.kind === "combo" &&
        b.codes.length === a.codes.length &&
        b.codes.every((c, i) => c === a.codes[i])
      );
    case "macro":
      return (
        b.kind === "macro" &&
        b.steps.length === a.steps.length &&
        b.steps.every(
          (s, i) =>
            s.code === a.steps[i].code &&
            !!s.shift === !!a.steps[i].shift &&
            s.delayMs === a.steps[i].delayMs,
        )
      );
  }
}

/* ============================================================
 * 工具
 * ============================================================ */

export function clampFunKey(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const i = Math.trunc(v);
  if (i < FUN_KEY_MIN || i > FUN_KEY_MAX) return 0;
  return i;
}

export function clampProfile(p: number): number {
  if (!Number.isFinite(p)) return 0;
  const i = Math.trunc(p);
  if (i < 0) return 0;
  if (i >= PROFILE_COUNT) return PROFILE_COUNT - 1;
  return i;
}

/* ============================================================
 * Profile name / icon 命令 payload
 * ============================================================ */

/** 0x15 PROFILE_NAME_SET 请求体：name 为空表示清除（回退设备默认名）。 */
export interface ProfileNameReq {
  profile: number; // 0..7
  name: string; // ≤ 32B
}

/** 0x11 PROFILE_ICON_SET 请求体：image 为空 / 缺省表示清除图标。 */
export interface ProfileIconReq {
  profile: number; // 0..7
  /** base64 encoded PNG / JPEG bytes（≤ 32 KB 上限，桌面端约定）。 */
  image?: string;
  /** 文件扩展名（"png" / "jpg"），不带点；缺省 = 清除。 */
  ext?: string;
}

/* ============================================================
 * 从 DeviceSettings 同步 Profile 元信息到 KeymapData
 * ============================================================ */

export function syncProfileFromSettings(
  d: KeymapData,
  s: DeviceSettings | null,
): KeymapData {
  if (!s) return d;
  return {
    ...d,
    activeProfile: clampProfile(s.active_keymap_profile),
    profileName: s.active_profile_name ?? "",
    hasCustomIcon: Boolean(s.active_profile_has_custom_icon),
  };
}
