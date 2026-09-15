/**
 * EKeys 协议层 —— DeviceSettings 类型与 diff/apply/mergePush/maskSensitive。
 *
 * 与 EKeysApp/src/protocol.rs 中同名函数语义严格一致；
 * clamp 范围按 design doc §4.3 描述。
 */

import { F, type FieldName, FieldMask } from "./mask";

export interface DeviceSettings {
  wifi_switch: number;
  connect_host: number;
  wifi_ssid: string;
  /** 敏感字段：写方向裸值，读方向被 maskSensitive 替换为 "***"。 */
  wifi_password: string;
  work_mode: number;
  rgb_mode: number;
  rgb_single_color: number;
  rgb_click_mode: number;
  rgb_brightness: number;
  tft_theme: number;
  tft_brightness: number;
  device_volume: number;
  audio_enable: number;
  power_mode: number;
  voice_enable: number;
  voice_trigger_key: number;
  voice_max_record_ms: number;
  voice_auto_enter: number;
  voice_cuid: string;
  /** 敏感字段：写入裸值，读取时被打码。 */
  voice_tencent_secret_id: string;
  /** 敏感字段：写入裸值，读取时被打码。 */
  voice_tencent_secret_key: string;
  pc_status_mask: number;
  active_keymap_profile: number;
  active_profile_name: string;
  active_profile_has_custom_icon: boolean;
}

/** 默认值：未连接 / 新建草稿时使用。 */
export const DEFAULT_SETTINGS: DeviceSettings = {
  wifi_switch: 0,
  connect_host: 0,
  wifi_ssid: "",
  wifi_password: "",
  work_mode: 0,
  rgb_mode: 0,
  rgb_single_color: 0,
  rgb_click_mode: 0,
  rgb_brightness: 80,
  tft_theme: 0,
  tft_brightness: 80,
  device_volume: 60,
  audio_enable: 1,
  power_mode: 1,
  voice_enable: 0,
  voice_trigger_key: 0,
  voice_max_record_ms: 15000,
  voice_auto_enter: 0,
  voice_cuid: "",
  voice_tencent_secret_id: "",
  voice_tencent_secret_key: "",
  pc_status_mask: 0,
  active_keymap_profile: 0,
  active_profile_name: "",
  active_profile_has_custom_icon: false,
};

/** 字符串按字节截断，不切断 UTF-8 边界。 */
function truncateBytes(s: string, maxBytes: number): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  if (bytes.length <= maxBytes) return s;
  // 简单策略：从后往前裁到不超过 maxBytes；可能含半个码点，再过滤掉孤立 surrogate
  let cut = maxBytes;
  // 避免把 surrogate pair 切开
  const last = bytes[cut - 1];
  const prev = cut >= 2 ? bytes[cut - 2] : 0;
  if (last !== undefined && prev !== undefined) {
    // UTF-8 4 字节字符的最后一字节在 0x80~0xBF，紧邻前一字节在 0xF0~0xF7
    if (last >= 0x80 && last <= 0xbf && prev >= 0xf0 && prev <= 0xf7) {
      cut -= 2;
    } else if (last >= 0x80 && last <= 0xbf && (cut < 3 || (bytes[cut - 3] ?? 0) >= 0xe0)) {
      // 3 字节字符最后一字节
      cut -= 1;
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, cut));
}

function clampInt(v: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  const i = Math.trunc(v);
  if (i < lo || i > hi) return fallback;
  return i;
}

function clamp01(v: number): 0 | 1 {
  return v ? 1 : 0;
}

/** 把任意形状的输入夹紧到合法 DeviceSettings。 */
export function clamp(raw: Partial<DeviceSettings>): DeviceSettings {
  const s: DeviceSettings = {
    ...DEFAULT_SETTINGS,
    ...raw,
    wifi_switch: clamp01(raw.wifi_switch ?? DEFAULT_SETTINGS.wifi_switch),
    connect_host: clamp01(raw.connect_host ?? DEFAULT_SETTINGS.connect_host),
    wifi_ssid: truncateBytes(String(raw.wifi_ssid ?? ""), 32),
    wifi_password: truncateBytes(String(raw.wifi_password ?? ""), 64),
    work_mode: clampInt(raw.work_mode ?? 0, 0, 2, 0),
    rgb_mode: clampInt(raw.rgb_mode ?? 0, 0, 9, 0),
    rgb_single_color: clampInt(raw.rgb_single_color ?? 0, 0, 23, 0),
    rgb_click_mode: clampInt(raw.rgb_click_mode ?? 0, 0, 2, 0),
    rgb_brightness: clampInt(raw.rgb_brightness ?? 80, 0, 100, 80),
    tft_theme: clampInt(raw.tft_theme ?? 0, 0, 4, 0),
    tft_brightness: clampInt(raw.tft_brightness ?? 80, 5, 100, 80),
    device_volume: clampInt(raw.device_volume ?? 60, 0, 100, 60),
    audio_enable: clamp01(raw.audio_enable ?? 1),
    power_mode: clampInt(raw.power_mode ?? 1, 0, 2, 1),
    voice_enable: clamp01(raw.voice_enable ?? 0),
    voice_trigger_key: clampInt(raw.voice_trigger_key ?? 0, 0, 11, 0),
    voice_max_record_ms: clampInt(
      raw.voice_max_record_ms ?? 15000,
      1000,
      60000,
      15000,
    ),
    voice_auto_enter: clamp01(raw.voice_auto_enter ?? 0),
    voice_cuid: truncateBytes(String(raw.voice_cuid ?? ""), 32),
    voice_tencent_secret_id: truncateBytes(
      String(raw.voice_tencent_secret_id ?? ""),
      64,
    ),
    voice_tencent_secret_key: truncateBytes(
      String(raw.voice_tencent_secret_key ?? ""),
      64,
    ),
    pc_status_mask: clampInt(raw.pc_status_mask ?? 0, 0, 0xffff, 0),
    active_keymap_profile: clampInt(raw.active_keymap_profile ?? 0, 0, 7, 0),
    active_profile_name: truncateBytes(String(raw.active_profile_name ?? ""), 32),
    active_profile_has_custom_icon: Boolean(
      raw.active_profile_has_custom_icon ?? false,
    ),
  };
  return s;
}

type FieldValue = string | number | boolean;

/**
 * 计算 a → b 的差异：
 * - 逐字段比较；
 * - 不一致则把 b 的值写入 delta，并把对应位置 1。
 */
export function diff(
  a: DeviceSettings,
  b: DeviceSettings,
): { delta: DeviceSettings; mask: FieldMask } {
  const delta = {} as DeviceSettings;
  const mask = FieldMask.empty();
  const keys = Object.keys(F) as FieldName[];
  for (const k of keys) {
    const va = a[k] as FieldValue;
    const vb = b[k] as FieldValue;
    if (va !== vb) {
      (delta as unknown as Record<string, FieldValue>)[k] = vb;
      mask.set(F[k]);
    }
  }
  return { delta, mask };
}

/**
 * 把 delta 应用到 target，返回新对象（不可变）。
 * mask 之外字段保持不变。
 */
export function apply(
  target: DeviceSettings,
  delta: Partial<DeviceSettings>,
  mask: FieldMask,
): DeviceSettings {
  const next: DeviceSettings = { ...target };
  const keys = Object.keys(F) as FieldName[];
  const deltaRec = delta as unknown as Record<string, FieldValue | undefined>;
  const nextRec = next as unknown as Record<string, FieldValue>;
  for (const k of keys) {
    if (mask.test(F[k])) {
      const v = deltaRec[k];
      if (v !== undefined) {
        nextRec[k] = v;
      }
    }
  }
  return next;
}

/**
 * 设备主动推送（0x87）合并语义（对齐 EKeysApp/src/app.rs::handle_link_event）：
 * - newSnap 与 oldSnap 求差得到 rawDelta；
 * - 仅在 oldMask ∩ newMask 置位的字段，把 draft 的值写回新快照；
 *   这些字段用户正在编辑，**不允许被推送覆盖**；
 * - 其它字段用 newSnap 覆盖。
 */
export function mergePush(
  newSnap: DeviceSettings,
  oldSnap: DeviceSettings,
  oldMask: FieldMask,
  newMask: FieldMask,
  draft: DeviceSettings,
): DeviceSettings {
  const keep = oldMask.intersect(newMask);
  const merged = { ...newSnap };
  const mergedRec = merged as unknown as Record<string, FieldValue>;
  const draftRec = draft as unknown as Record<string, FieldValue>;
  const keys = Object.keys(F) as FieldName[];
  for (const k of keys) {
    if (keep.test(F[k])) {
      mergedRec[k] = draftRec[k];
    }
  }
  // 静默使用旧值填充 newSnap 仍缺失的字段（固件可能不返回所有字段）
  void oldSnap;
  return merged;
}

/** 把 3 个敏感字段替换为 "***"。返回新对象。 */
export function maskSensitive(s: DeviceSettings): DeviceSettings {
  return {
    ...s,
    wifi_password: s.wifi_password ? "***" : "",
    voice_tencent_secret_id: s.voice_tencent_secret_id ? "***" : "",
    voice_tencent_secret_key: s.voice_tencent_secret_key ? "***" : "",
  };
}

/** 哪些字段是敏感字段（UI 需要 type=password + autocomplete=new-password）。 */
export const SENSITIVE_FIELDS: ReadonlySet<FieldName> = new Set<FieldName>([
  "wifi_password",
  "voice_tencent_secret_id",
  "voice_tencent_secret_key",
]);
