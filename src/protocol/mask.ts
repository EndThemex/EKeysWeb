/**
 * EKeys 协议层 —— FieldMask（字段脏标记）。
 *
 * 用 bigint 而非 number 是为了未来字段 > 25 时无需重构；
 * 当前 25 字段用低 25 位即可。
 */

export class FieldMask {
  private bits: bigint;

  private constructor(b: bigint) {
    this.bits = b;
  }

  /** 全 0 mask。 */
  static empty(): FieldMask {
    return new FieldMask(0n);
  }

  /** 低 FIELD_COUNT 位全 1。 */
  static all(): FieldMask {
    return new FieldMask((1n << BigInt(64)) - 1n);
  }

  static fromBits(b: bigint): FieldMask {
    return new FieldMask(b);
  }

  /** 把第 `bit` 位置 1，返回新对象（不可变）。 */
  set(bit: number): FieldMask {
    if (bit < 0 || bit >= 64) throw new RangeError(`bit out of range: ${bit}`);
    return new FieldMask(this.bits | (1n << BigInt(bit)));
  }

  /** 第 `bit` 位是否为 1。 */
  test(bit: number): boolean {
    if (bit < 0 || bit >= 64) return false;
    return ((this.bits >> BigInt(bit)) & 1n) === 1n;
  }

  /** 与另一个 mask 求交。 */
  intersect(other: FieldMask): FieldMask {
    return new FieldMask(this.bits & other.bits);
  }

  /** 与另一个 mask 求并。 */
  union(other: FieldMask): FieldMask {
    return new FieldMask(this.bits | other.bits);
  }

  /** 是否没有任何位置 1。 */
  isEmpty(): boolean {
    return this.bits === 0n;
  }

  /** 已置位的位数（用于「将下发 N 项」展示）。 */
  size(): number {
    let v = this.bits;
    let n = 0;
    while (v !== 0n) {
      if ((v & 1n) === 1n) n++;
      v >>= 1n;
    }
    return n;
  }

  /** 大端十六进制字符串，便于日志。 */
  toJSON(): string {
    return "0x" + this.bits.toString(16).padStart(16, "0");
  }

  /** 仅用于调试。 */
  toString(): string {
    return this.toJSON();
  }
}

/**
 * DeviceSettings 字段位序号（与 EKeysApp/src/protocol.rs::F_* 严格对齐）。
 * 新增字段必须在末尾追加，**禁止**插入中间——所有下发的 diff 都依赖
 * 固件按位判定。
 */
export const F = {
  wifi_switch: 0,
  connect_host: 1,
  wifi_ssid: 2,
  wifi_password: 3,
  work_mode: 4,
  rgb_mode: 5,
  rgb_single_color: 6,
  rgb_click_mode: 7,
  rgb_brightness: 8,
  tft_theme: 9,
  tft_brightness: 10,
  device_volume: 11,
  audio_enable: 12,
  power_mode: 13,
  voice_enable: 14,
  voice_trigger_key: 15,
  voice_max_record_ms: 16,
  voice_auto_enter: 17,
  voice_cuid: 18,
  voice_tencent_secret_id: 19,
  voice_tencent_secret_key: 20,
  pc_status_mask: 21,
  active_keymap_profile: 22,
  active_profile_name: 23,
  active_profile_has_custom_icon: 24,
} as const;

export type FieldName = keyof typeof F;
export const FIELD_COUNT = 25;
