/**
 * AI Mode 二进制帧协议编码器（纯函数，无 IO / React / DOM）。
 *
 * 权威定义：EKeys/docs/13-ai-mode-image-streaming.md §4.2。
 * - 24 字节帧头（小端）+ 8 字节分片头 + 负载；
 * - 首包固定以 '\n' (0x0A) 开头，供固件 USB CDC 分流器定界；
 * - frame_crc32 恒启用（flags.bit1），高画质时置 flags.bit0=scale_half；
 * - 设备 → 主机方向为 `ai_ctl` JSON 行。
 */

export const AI_MAGIC = 0x5aa5;
export const AI_VERSION = 1;

export const AI_TYPE_JPEG = 1;
export const AI_TYPE_RGB565 = 2;
export const AI_TYPE_RLE565 = 3;
export const AI_TYPE_CONTROL = 4;

export const AI_CHUNK_USB = 4096;
export const AI_DISPLAY_W = 428;
export const AI_DISPLAY_H = 142;

/** 主机 → 设备控制帧的 kind。 */
export const AI_CONTROL_KIND_PING = 1;

/** ai_ctl 的 result 语义。 */
export const AI_RESULT = {
  OK: 0,
  CRC: 1,
  SIZE: 2,
  BUSY: 3,
  TIMEOUT: 4,
} as const;

/** 设备回传的 `ai_ctl` JSON 对象。字段全部可选，按 kind 读取。 */
export interface AiCtlMsg {
  kind?: string;
  result?: number;
  frame_id?: number;
  w?: number;
  h?: number;
  formats?: number[];
  chunk_payload?: number;
  max_payload?: number;
  max_raw_payload?: number;
  version?: number;
  free_slots?: number;
  dropped?: number;
  fps_x10?: number;
  bytes_per_sec?: number;
  [k: string]: unknown;
}

/** CRC-16/CCITT-FALSE（poly 0x1021, init 0xFFFF）。 */
export function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** CRC-32 (IEEE 802.3, 与 zlib.crc32 一致)，运行时生成查表。 */
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface FrameSpec {
  frameId: number;
  type: number;
  payload: Uint8Array;
  width: number;
  height: number;
  flags: number;
  chunkPayload: number;
}

/**
 * 生成「分片字节块」序列：首块 = '\n' + 24B 帧头，其后每块 = 8B 分片头 + 负载。
 * 调用方按顺序逐块 `writeRaw()`。
 */
function buildFramePackets(spec: FrameSpec): Uint8Array[] {
  const header = new Uint8Array(24);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, AI_MAGIC, true);
  dv.setUint8(2, AI_VERSION);
  dv.setUint8(3, spec.type);
  dv.setUint16(4, spec.frameId & 0xffff, true);
  dv.setUint16(6, spec.width, true);
  dv.setUint16(8, spec.height, true);
  dv.setUint8(10, spec.flags);
  dv.setUint8(11, 0);
  dv.setUint32(12, spec.payload.length, true);
  dv.setUint32(16, crc32(spec.payload), true);
  dv.setUint16(20, spec.chunkPayload, true);
  dv.setUint16(22, crc16(header.subarray(0, 22)), true);

  const packets: Uint8Array[] = [];
  const first = new Uint8Array(1 + header.length);
  first[0] = 0x0a; // '\n'：固件 USB 分流定界依据
  first.set(header, 1);
  packets.push(first);

  const chunkPayload = Math.max(1, spec.chunkPayload);
  const nChunks = Math.ceil(spec.payload.length / chunkPayload);
  for (let idx = 0; idx < nChunks; idx++) {
    const start = idx * chunkPayload;
    const part = spec.payload.subarray(
      start,
      Math.min(start + chunkPayload, spec.payload.length),
    );
    const pkt = new Uint8Array(8 + part.length);
    const pdv = new DataView(pkt.buffer);
    pdv.setUint16(0, spec.frameId & 0xffff, true);
    pdv.setUint16(2, idx, true);
    pdv.setUint16(4, part.length, true);
    pdv.setUint16(6, crc16(part), true);
    pkt.set(part, 8);
    packets.push(pkt);
  }
  return packets;
}

/**
 * 编码一帧图像。
 *
 * @param frameId      自增 u16 帧号（调用方负责回绕）
 * @param jpeg         JPEG 负载
 * @param chunkPayload USB = 4096，TCP = 8192
 * @param width        428（高画质 856 + scaleHalf）
 * @param height       142（高画质 284 + scaleHalf）
 * @param scaleHalf    true 时置 flags.bit0，设备按 1/2 降采样显示
 */
export function encodeFrame(
  frameId: number,
  jpeg: Uint8Array,
  chunkPayload = AI_CHUNK_USB,
  width = AI_DISPLAY_W,
  height = AI_DISPLAY_H,
  scaleHalf = false,
): Uint8Array[] {
  return buildFramePackets({
    frameId,
    type: AI_TYPE_JPEG,
    payload: jpeg,
    width,
    height,
    // bit1 = 带 frame_crc32（恒启用），bit0 = scale_half
    flags: 0x02 | (scaleHalf ? 0x01 : 0x00),
    chunkPayload,
  });
}

/**
 * 编码主机 → 设备控制帧（type=4，12 字节负载）。
 * 当前仅用于握手探针 PING。
 */
export function encodeControlFrame(
  kind: number,
  result = 0,
  freeSlots = 0,
  droppedFrames = 0,
  frameId = 0,
  fpsX10 = 0,
  bytesPerSec = 0,
): Uint8Array[] {
  const payload = new Uint8Array(12);
  const dv = new DataView(payload.buffer);
  dv.setUint8(0, kind);
  dv.setUint8(1, result);
  dv.setUint8(2, freeSlots);
  dv.setUint8(3, droppedFrames);
  dv.setUint16(4, frameId & 0xffff, true);
  dv.setUint16(6, fpsX10, true);
  dv.setUint32(8, bytesPerSec >>> 0, true);

  return buildFramePackets({
    frameId,
    type: AI_TYPE_CONTROL,
    payload,
    width: AI_DISPLAY_W,
    height: AI_DISPLAY_H,
    flags: 0x02,
    chunkPayload: payload.length,
  });
}

/** 从一行文本中解析 `{"ai_ctl":{...}}`；非该形状返回 null。 */
export function parseAiCtlLine(line: string): AiCtlMsg | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const ctl = obj.ai_ctl;
    if (!ctl || typeof ctl !== "object" || Array.isArray(ctl)) return null;
    return ctl as AiCtlMsg;
  } catch {
    return null;
  }
}

/** 从已解析的 JSON 行对象中识别 ai_ctl（供 useEKeysDevice 分流）。 */
export function isAiCtlLine(obj: Record<string, unknown>): boolean {
  return (
    "ai_ctl" in obj &&
    !("cmd" in obj) &&
    typeof obj.ai_ctl === "object" &&
    obj.ai_ctl !== null &&
    !Array.isArray(obj.ai_ctl)
  );
}
