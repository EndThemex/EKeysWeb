import { describe, expect, it } from "vitest";
import {
  AI_CHUNK_USB,
  AI_RESULT,
  AI_TYPE_CONTROL,
  AI_TYPE_JPEG,
  crc16,
  crc32,
  encodeControlFrame,
  encodeFrame,
  isAiCtlLine,
  parseAiCtlLine,
} from "../aiFrame";

/** 读取帧头（首包跳过 '\n'）。 */
function headerOf(packets: Uint8Array[]): DataView {
  const first = packets[0];
  expect(first[0]).toBe(0x0a);
  return new DataView(first.buffer, first.byteOffset + 1, 24);
}

describe("CRC", () => {
  it("matches CRC-16/CCITT-FALSE check value", () => {
    expect(crc16(new TextEncoder().encode("123456789"))).toBe(0x29b1);
  });

  it("matches zlib CRC-32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("crc32 of empty payload is 0", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("encodeFrame", () => {
  const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  it("writes the 24-byte header with the documented little-endian fields", () => {
    const packets = encodeFrame(7, payload);
    expect(packets).toHaveLength(2);

    const dv = headerOf(packets);
    expect(dv.getUint16(0, true)).toBe(0x5aa5);
    expect(dv.getUint8(2)).toBe(1); // version
    expect(dv.getUint8(3)).toBe(AI_TYPE_JPEG);
    expect(dv.getUint16(4, true)).toBe(7);
    expect(dv.getUint16(6, true)).toBe(428);
    expect(dv.getUint16(8, true)).toBe(142);
    expect(dv.getUint8(10)).toBe(0x02); // frame_crc32, no scale_half
    expect(dv.getUint8(11)).toBe(0);
    expect(dv.getUint32(12, true)).toBe(payload.length);
    expect(dv.getUint32(16, true)).toBe(crc32(payload));
    expect(dv.getUint16(20, true)).toBe(AI_CHUNK_USB);
    expect(dv.getUint16(22, true)).toBe(
      crc16(new Uint8Array(dv.buffer, dv.byteOffset, 22)),
    );
  });

  it("prefixes the first packet with '\\n' and emits chunk headers", () => {
    const packets = encodeFrame(7, payload);
    const chunk = packets[1];
    const cdv = new DataView(chunk.buffer, chunk.byteOffset, 8);
    expect(cdv.getUint16(0, true)).toBe(7);
    expect(cdv.getUint16(2, true)).toBe(0);
    expect(cdv.getUint16(4, true)).toBe(payload.length);
    expect(cdv.getUint16(6, true)).toBe(crc16(payload));
    expect(Array.from(chunk.subarray(8))).toEqual(Array.from(payload));
  });

  it("splits payloads across multiple chunks", () => {
    const big = new Uint8Array(9000);
    const packets = encodeFrame(1, big);
    // header + ceil(9000 / 4096) = 3
    expect(packets).toHaveLength(4);
    const lens = packets.slice(1).map((p) =>
      new DataView(p.buffer, p.byteOffset, 8).getUint16(4, true),
    );
    expect(lens).toEqual([4096, 4096, 808]);
  });

  it("sets scale_half and high-quality dimensions", () => {
    const packets = encodeFrame(2, payload, 4096, 856, 284, true);
    const dv = headerOf(packets);
    expect(dv.getUint8(10)).toBe(0x03);
    expect(dv.getUint16(6, true)).toBe(856);
    expect(dv.getUint16(8, true)).toBe(284);
  });

  it("wraps frame ids to u16", () => {
    const packets = encodeFrame(0x1_0002, payload);
    expect(headerOf(packets).getUint16(4, true)).toBe(2);
  });
});

describe("encodeControlFrame", () => {
  it("wraps a 12-byte payload in a type-4 frame", () => {
    const packets = encodeControlFrame(1);
    expect(packets).toHaveLength(2);
    const dv = headerOf(packets);
    expect(dv.getUint8(3)).toBe(AI_TYPE_CONTROL);
    expect(dv.getUint32(12, true)).toBe(12);
    expect(dv.getUint16(20, true)).toBe(12);

    const chunk = packets[1];
    const cdv = new DataView(chunk.buffer, chunk.byteOffset, 8);
    expect(cdv.getUint16(4, true)).toBe(12);
    expect(chunk[8]).toBe(1); // kind = PING
    expect(chunk[9]).toBe(AI_RESULT.OK);
  });
});

describe("ai_ctl parsing", () => {
  it("parses a hello line", () => {
    const msg = parseAiCtlLine(
      '{"ai_ctl":{"kind":"hello","result":0,"w":428,"h":142,"formats":[1,2,3]}}',
    );
    expect(msg).not.toBeNull();
    expect(msg?.kind).toBe("hello");
    expect(msg?.w).toBe(428);
    expect(msg?.formats).toEqual([1, 2, 3]);
  });

  it("rejects JSON lines that are not ai_ctl", () => {
    expect(parseAiCtlLine('{"cmd":7,"seq":1}')).toBeNull();
    expect(parseAiCtlLine("firmware log line")).toBeNull();
    expect(parseAiCtlLine("{not json")).toBeNull();
  });

  it("detects ai_ctl objects without cmd", () => {
    expect(isAiCtlLine({ ai_ctl: { kind: "hello" } })).toBe(true);
    expect(isAiCtlLine({ ai_ctl: { kind: "hello" }, cmd: 7 })).toBe(false);
    expect(isAiCtlLine({ cmd: 7 })).toBe(false);
    expect(isAiCtlLine({ ai_ctl: null })).toBe(false);
  });
});
