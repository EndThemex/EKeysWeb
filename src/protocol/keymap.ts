/**
 * EKeys 协议层 —— 键映射（Keymap）。
 *
 * 字段编号与桌面端 EKeysApp/src/protocol.rs::KeymapData 1:1 对齐；
 * 编码逻辑对齐 docs/web-config-design.md §10 + EKeysApp/docs/protocol-usage.md §9.3。
 *
 * 关键约定（与协议 §9.3 / §10.4 一致）：
 * - 物理键 physical 1..11（按 (row, col) 升序，跳过 encoder 槽）
 * - 固件 KeyNameTable.cpp 只解析 a-z / 0-9 / Enter / Backspace / Space
 *   + `0xNN`（hex HID）；其它（Media / Mouse / LayerSwitch / Macro）作为
 *   `function` 字符串尽力编码，固件当前未实现解析
 * - 回读限制：固件 macro 是 `+` 序列，与桌面端步进宏模型不对等；
 *   未知 function 字符串落到 UI 时统一标为 "unbound"
 * - 编辑只动 layer 0（Base）；Fn / Shift / Custom 三个 layer 暂不参与编辑
 *   （设计文档 §10.4 的 M3 边界）
 */

import type { DeviceSettings } from "./settings";

/* ============================================================
 * 物理键常量
 * ============================================================ */

/** 物理按键数（11 键，跳过 encoder 槽）。 */
export const PHYSICAL_KEY_COUNT = 11;

/** 4 个 layer（与 EKeysApp LAYER_BASE / FUN1 / FUN2 + 1 扩展位一致）。 */
export const LAYER_COUNT = 4;

/** layer 索引常量（0 = Base，M3 只编辑这一层）。 */
export const LAYER_BASE = 0;
export const LAYER_FUN1 = 1;
export const LAYER_FUN2 = 2;
export const LAYER_CUSTOM = 3;

/** Profile 数（与 DeviceSettings.active_keymap_profile 槽数对齐：0..7）。 */
export const PROFILE_COUNT = 8;

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

/** 多媒体键（consumer control code）。 */
export interface MediaAction {
  kind: "media";
  /** 0xE8 = VolumeUp / 0xE9 = VolumeDown / 0xEA = Mute 等（裸数值）。 */
  code: number;
}

/** 鼠标按键（button + 可选连点次数）。 */
export interface MouseAction {
  kind: "mouse";
  /** 1 = Left / 2 = Right / 3 = Middle。 */
  button: number;
  clicks?: number;
}

/** 步进宏（App 模型；固件回读会丢失为 unbound，UI 必须显式提示）。 */
export interface MacroAction {
  kind: "macro";
  steps: { action: KeyAction; delayMs?: number }[];
}

/** 切换 layer（momentary = 按住进入；toggle = 点击进入再点击退出）。 */
export interface LayerSwitchAction {
  kind: "layer-switch";
  target: number;
  mode: "momentary" | "toggle";
}

/** Fun 修饰键绑定（FUN1/FUN2，1=fun1, 2=fun2；0=清除）。 */
export interface FunModifierAction {
  kind: "fun-modifier";
  /** 0 = 清除，1 = fun1，2 = fun2。 */
  slot: 0 | 1 | 2;
}

export type KeyAction =
  | UnboundAction
  | KeyboardAction
  | MediaAction
  | MouseAction
  | MacroAction
  | LayerSwitchAction
  | FunModifierAction;

/* ============================================================
 * FirmwareKeyEntry —— 协议层 wire 模型
 * ============================================================ */

/**
 * 0x05 / 0x06 keymap 数组中的一项（来自 / 发往固件）。
 *
 * 物理键 normal 字段是 `KeyNameTable.cpp` 可解析的字符串：
 * - a-z / 0-9 / Enter / Backspace / Space
 * - `0xNN`（hex HID code；解析为单键）
 * - `+` 连接的多个键（如 `Ctrl+C`、`Alt+Tab`）
 * - 其它（Media / Mouse / LayerSwitch / Macro 等）写到 `function` 字段
 *
 * 当前固件只解析 a-z / 0-9 / Enter / Backspace / Space + 0xNN；
 * `function` 字段是预留扩展（桌面端协议层复用此结构）。
 */
export interface FirmwareKeyEntry {
  physical: number; // 1..11
  normal: string; // a-z / 0-9 / 0xNN / +
  function: string; // 预留：media / mouse / layer-switch / macro
}

/* ============================================================
 * KeymapData —— 当前激活 Profile 的完整 4 层键映射
 * ============================================================ */

/**
 * 一层 11 键绑定。
 */
export interface LayerBinding {
  slots: KeyAction[]; // 长度 = PHYSICAL_KEY_COUNT
}

/**
 * 整个 Keymap 数据快照（App 端）：
 * - profile：当前编辑哪个 Profile（0..7）
 * - profile_name / has_custom_icon：仅展示用，UI 写走 0x15 / 0x11
 * - layers：4 层 × 11 键；M3 只编辑 layer 0
 */
export interface KeymapData {
  profiles: number; // 1..8
  activeProfile: number; // 0..7
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
    layers,
    profileName: "",
    hasCustomIcon: false,
  };
}

/* ============================================================
 * KeyAction ↔ FirmwareKeyEntry 编码
 * ============================================================ */

/** USB HID usage id → 单字符名（a-z）。不在表内返回 null。 */
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

function hidLabel(code: number): string | null {
  if (code in HID_ALPHA) return HID_ALPHA[code];
  if (code in HID_DIGIT) return HID_DIGIT[code];
  if (code in HID_SPECIAL) return HID_SPECIAL[code];
  return null;
}

/**
 * 把 KeyAction 编码为固件可解析的 {normal, function} 字符串。
 * 不可解析的动作 → normal = "", function = "...提示..."。
 */
export function actionToFirmware(
  a: KeyAction,
): { normal: string; function: string } {
  switch (a.kind) {
    case "unbound":
      return { normal: "", function: "" };
    case "keyboard": {
      const lbl = hidLabel(a.code);
      if (lbl) return { normal: lbl, function: "" };
      return { normal: `0x${a.code.toString(16).padStart(2, "0")}`, function: "" };
    }
    case "media":
      // 固件 KeyNameTable 当前未实现媒体键；写 function 字段供将来扩展
      return { normal: "", function: `media(0x${a.code.toString(16)})` };
    case "mouse":
      return {
        normal: "",
        function: `mouse(button=${a.button}${a.clicks ? `,clicks=${a.clicks}` : ""})`,
      };
    case "macro":
      // 固件 macro 是 + 序列；App 步进宏无法无损回写，标为 pending
      return { normal: "", function: `macro(steps=${a.steps.length})` };
    case "layer-switch":
      return {
        normal: "",
        function: `layer(target=${a.target},mode=${a.mode})`,
      };
    case "fun-modifier":
      // Fun 修饰键不属于键映射条目，仅用于 settings 同步；这里兜底
      return { normal: "", function: a.slot === 0 ? "" : `fun(${a.slot})` };
  }
}

/**
 * 把固件响应 entry 还原为 KeyAction。
 * 无法识别的 function 字符串 → unbound（UI 需要提示）。
 */
export function firmwareToAction(entry: FirmwareKeyEntry): KeyAction {
  const fn = entry.function?.trim() ?? "";
  if (fn) {
    // 解析预定义的 function 形态
    if (fn.startsWith("media(")) {
      const m = /media\(0x([0-9a-fA-F]+)\)/.exec(fn);
      if (m) return { kind: "media", code: parseInt(m[1], 16) };
    } else if (fn.startsWith("mouse(")) {
      const m = /mouse\(button=(\d+)(?:,clicks=(\d+))?\)/.exec(fn);
      if (m) {
        return {
          kind: "mouse",
          button: parseInt(m[1], 10),
          clicks: m[2] ? parseInt(m[2], 10) : undefined,
        };
      }
    } else if (fn.startsWith("layer(")) {
      const m = /layer\(target=(\d+),mode=(\w+)\)/.exec(fn);
      if (m) {
        return {
          kind: "layer-switch",
          target: parseInt(m[1], 10),
          mode: m[2] === "toggle" ? "toggle" : "momentary",
        };
      }
    } else if (fn.startsWith("macro(")) {
      return { kind: "macro", steps: [] };
    }
    return { kind: "unbound" };
  }
  const normal = entry.normal?.trim() ?? "";
  if (!normal) return { kind: "unbound" };

  // 0xNN → keyboard
  if (/^0x[0-9a-fA-F]+$/.test(normal)) {
    return { kind: "keyboard", code: parseInt(normal.slice(2), 16) };
  }
  // a-z / 0-9 单字符
  if (normal.length === 1) {
    const code = HID_ALPHA_INV[normal] ?? HID_DIGIT_INV[normal];
    if (code !== undefined) return { kind: "keyboard", code };
  }
  // 特殊键
  for (const [code, lbl] of Object.entries(HID_SPECIAL)) {
    if (lbl === normal) return { kind: "keyboard", code: parseInt(code, 10) };
  }
  // 组合键（Ctrl+C、Alt+Tab）—— 单步识别为第一步；其余回退 unbound
  if (normal.includes("+")) {
    const first = normal.split("+")[0];
    const code = HID_SPECIAL_INV[first];
    if (code !== undefined) return { kind: "keyboard", code };
  }
  return { kind: "unbound" };
}

const HID_ALPHA_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_ALPHA).map(([k, v]) => [v, parseInt(k, 10)]),
);
const HID_DIGIT_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_DIGIT).map(([k, v]) => [v, parseInt(k, 10)]),
);
const HID_SPECIAL_INV: Record<string, number> = Object.fromEntries(
  Object.entries(HID_SPECIAL).map(([k, v]) => [v, parseInt(k, 10)]),
);

/* ============================================================
 * KeymapData ↔ FirmwareKeyEntry[]
 * ============================================================ */

/**
 * 固件 GET 响应 / SET 请求均为一个 `keymap` 数组（顶层字段，见 frame.ts）。
 * 当前 layer 0 的 11 项 entries 直接放到这个数组里。
 *
 * 注：固件 KeyNameTable.cpp 当前只支持 layer 0，因此 M3 范围只同步
 * layer 0 的 11 个 entry，layer 1..3 视为占位。
 */
export function dataToFirmwareEntries(d: KeymapData): FirmwareKeyEntry[] {
  const entries: FirmwareKeyEntry[] = [];
  const layer = d.layers[LAYER_BASE];
  for (let i = 0; i < PHYSICAL_KEY_COUNT; i++) {
    const a = layer?.slots[i] ?? { kind: "unbound" };
    const { normal, function: fn } = actionToFirmware(a);
    entries.push({ physical: i + 1, normal, function: fn });
  }
  return entries;
}

/**
 * 把固件返回的 entry 列表写回 KeymapData 的 layer 0；其它层不变。
 */
export function applyFirmwareEntries(
  d: KeymapData,
  entries: FirmwareKeyEntry[],
): KeymapData {
  const next: KeymapData = {
    ...d,
    layers: d.layers.map((l, idx) =>
      idx === LAYER_BASE
        ? {
            slots: Array.from({ length: PHYSICAL_KEY_COUNT }, (_, i) =>
              firmwareToAction(entries[i] ?? { physical: i + 1, normal: "", function: "" }),
            ),
          }
        : l,
    ),
  };
  return next;
}

/**
 * 计算 draft 与 snapshot 在 layer 0 上的差异，返回被修改的 physical 索引。
 * SET 协议层是「整表覆盖」，因此 UI 主要依赖"是否整表下发"指示；
 * 此函数用于向 Log / Toast 展示「本次改了哪几键」。
 */
export function diffKeymap(
  draft: KeymapData,
  snapshot: KeymapData,
): { physical: number[]; changed: boolean } {
  const dr = draft.layers[LAYER_BASE]?.slots ?? [];
  const sr = snapshot.layers[LAYER_BASE]?.slots ?? [];
  const idxs: number[] = [];
  for (let i = 0; i < PHYSICAL_KEY_COUNT; i++) {
    if (!actionsEqual(dr[i], sr[i])) idxs.push(i + 1);
  }
  return { physical: idxs, changed: idxs.length > 0 };
}

function actionsEqual(a: KeyAction | undefined, b: KeyAction | undefined): boolean {
  if (!a || !b) return (a ?? null) === (b ?? null);
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "unbound":
      return true;
    case "keyboard":
    case "media":
      return b.kind === a.kind && (b as { code: number }).code === a.code;
    case "mouse": {
      if (b.kind !== "mouse") return false;
      const mb = b;
      return mb.button === a.button && (mb.clicks ?? 0) === (a.clicks ?? 0);
    }
    case "macro": {
      if (b.kind !== "macro") return false;
      // 步进宏只比长度，细节不强校验
      return b.steps.length === a.steps.length;
    }
    case "layer-switch": {
      if (b.kind !== "layer-switch") return false;
      return b.target === a.target && b.mode === a.mode;
    }
    case "fun-modifier":
      return b.kind === "fun-modifier" && b.slot === a.slot;
  }
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
  /** base64 encoded RGB565 / PNG / JPEG bytes（≤ 32 KB 上限，桌面端约定）。 */
  image?: string;
  /** 文件扩展名（"png" / "jpg"），不带点；缺省 = 清除。 */
  ext?: string;
}

/* ============================================================
 * 反射：从 DeviceSettings 同步 Profile 名称到 KeymapData
 * ============================================================ */

/**
 * 把 DeviceSettings 中的 active_keymap_profile / active_profile_name
 * / active_profile_has_custom_icon 合并进 KeymapData。
 */
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

export function clampProfile(p: number): number {
  if (!Number.isFinite(p)) return 0;
  const i = Math.trunc(p);
  if (i < 0) return 0;
  if (i >= PROFILE_COUNT) return PROFILE_COUNT - 1;
  return i;
}
