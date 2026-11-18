/**
 * useAiStream — AI Mode 图像推流会话状态机。
 *
 * 职责（对应 docs/ai-image-streaming.md §5.1 / §6）：
 * - 握手：发 '\n' 探针等 `ai_ctl` hello；若 hello 需首帧后才回，则用一帧真实 JPEG 探测；
 * - 发送：encodeFrame → 逐片 writeRaw；
 * - 流控：最多 2 帧未 ACK，result=busy 时停发至下一 ACK；
 * - 生命周期：推流期间 pauseHeartbeat + setAiStreaming(true)，停止/失败/卸载时成对恢复；
 * - 统计：直接透传 `ai_ctl` 的 fps_x10 / bytes_per_sec / dropped。
 *
 * 本 hook 只做协议与状态机，不接触 Canvas / DOM 编码；
 * 图像由调用方通过 `makeJpeg(highQuality)` 提供。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDeviceSession } from "./DeviceSessionContext";
import {
  AI_CHUNK_USB,
  AI_CONTROL_KIND_PING,
  AI_DISPLAY_H,
  AI_DISPLAY_W,
  AI_RESULT,
  AI_TYPE_JPEG,
  encodeControlFrame,
  encodeFrame,
  type AiCtlMsg,
} from "../protocol/aiFrame";

export type AiStreamState =
  | "idle"
  | "handshake"
  | "ready"
  | "streaming"
  | "failed";

export type AiStreamErrorKind =
  | "disconnected"
  | "notOnAiPage"
  | "unsupported"
  | "sizeMismatch"
  | "busy"
  | "deviceLost"
  | "encode";

export interface AiStreamError {
  kind: AiStreamErrorKind;
  message: string;
  /** 附加上下文（例如设备回传的实际尺寸、CRC 结果）。 */
  detail?: string;
}

export interface AiStreamStats {
  /** 当前未 ACK 的帧数（上限 2）。 */
  inflight: number;
  /** 本次会话已发出的帧数。 */
  framesSent: number;
  fps: number | null;
  bytesPerSec: number | null;
  dropped: number | null;
  freeSlots: number | null;
  lastResult: number | null;
}

export interface AiHello {
  w: number;
  h: number;
  formats: number[];
  chunkPayload: number;
  maxPayload: number | null;
  maxRawPayload: number | null;
  version: number | null;
  freeSlots: number | null;
}

export interface UseAiStreamOptions {
  /** 生成一帧 JPEG 负载；highQuality=true 时输出 856×284。 */
  makeJpeg: (highQuality: boolean) => Promise<Uint8Array>;
  /** 高画质模式：856×284 + flags.scale_half。 */
  highQuality: boolean;
}

/** 固件流控：最多 2 帧未 ACK。 */
const MAX_INFLIGHT = 2;
/**
 * 裸 '\n' 探针轮数。固件补发 hello 受 last_hello_ms_ 的 1s 限流，且
 * takeHandshakeRequest() 读即清零：单发一次若落在限流窗口内会被静默吞掉，
 * 必须跨窗口重试。
 */
const HELLO_PROBES = 2;
/** 每轮 '\n' 后等待 hello 的时间（必须大于固件 1s 限流窗口）。 */
const HELLO_WAIT_MS = 1200;
/** PING 控制帧发出后等待 ACK 的时间。 */
const PROBE_WAIT_MS = 1500;
/** 单帧推送后等待 ACK 的时间（超时也恢复心跳）。 */
const PUSH_ACK_WAIT_MS = 1200;
/** 推流最小帧间隔（setTimeout 下限）。 */
const MIN_FRAME_MS = 16;
const DEFAULT_FPS = 12;
const MIN_FPS = 1;
const MAX_FPS = 20;

const EMPTY_STATS: AiStreamStats = {
  inflight: 0,
  framesSent: 0,
  fps: null,
  bytesPerSec: null,
  dropped: null,
  freeSlots: null,
  lastResult: null,
};

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** docs §3.3：hello 能力校验；返回 null 表示可用。 */
function helloProblem(h: AiHello): string | null {
  if (!h.formats.includes(AI_TYPE_JPEG)) {
    return `device does not support JPEG (formats=[${h.formats.join(",")}])`;
  }
  const base = h.w === AI_DISPLAY_W && h.h === AI_DISPLAY_H;
  const highQuality = h.w === 856 && h.h === 284;
  if (!base && !highQuality) {
    return `unexpected display size ${h.w}×${h.h}`;
  }
  return null;
}

function toAiError(e: unknown, fallback: AiStreamErrorKind): AiStreamError {
  const obj = e as { kind?: unknown; message?: unknown } | null;
  const rawKind = obj && typeof obj.kind === "string" ? obj.kind : null;
  const message =
    obj && typeof obj.message === "string"
      ? obj.message
      : e instanceof Error
        ? e.message
        : String(e ?? "unknown error");

  if (
    rawKind === "notOnAiPage" ||
    rawKind === "unsupported" ||
    rawKind === "sizeMismatch" ||
    rawKind === "deviceLost" ||
    rawKind === "encode"
  ) {
    return { kind: rawKind, message };
  }
  // 配置命令被推流门控 / 写失败 → 都视为串口不可用
  if (
    rawKind === "aiStreaming" ||
    rawKind === "writeFailed" ||
    rawKind === "portBusy"
  ) {
    return { kind: "deviceLost", message };
  }
  return { kind: fallback, message };
}

/** 读 ref 内的状态；用函数包一层，避免 TS 对属性访问做过度收窄。 */
function readState(ref: { current: AiStreamState }): AiStreamState {
  return ref.current;
}

export function useAiStream({ makeJpeg, highQuality }: UseAiStreamOptions) {
  const {
    connected,
    writeRaw,
    onAiCtl,
    pauseHeartbeat,
    resumeHeartbeat,
    setAiStreaming,
  } = useDeviceSession();

  // 回调 / 高画质开关在每次 render 都可能变化，统一存 ref，避免状态机重订阅
  const optsRef = useRef({ makeJpeg, highQuality });
  optsRef.current = { makeJpeg, highQuality };

  const [state, setState] = useState<AiStreamState>("idle");
  const [error, setError] = useState<AiStreamError | null>(null);
  const [hello, setHello] = useState<AiHello | null>(null);
  const [stats, setStats] = useState<AiStreamStats>(EMPTY_STATS);
  const [fps, setFpsState] = useState(DEFAULT_FPS);

  const stateRef = useRef<AiStreamState>("idle");
  const frameIdRef = useRef(0);
  const inflightRef = useRef(0);
  /** 未 ACK 的 frame_id 集合：用于识别任意 kind 的 ai_ctl 回执。 */
  const pendingIdsRef = useRef<Set<number>>(new Set());
  const framesSentRef = useRef(0);
  /** 收到 busy 后暂停发送，直到下一个 OK ACK。 */
  const holdRef = useRef(false);
  /** 同一时刻只允许一次 makeJpeg + write 序列。 */
  const sendingRef = useRef(false);
  const fpsRef = useRef(DEFAULT_FPS);
  const timerRef = useRef<number | null>(null);
  const helloRef = useRef<AiHello | null>(null);
  const handshakeRef = useRef<((msg: AiCtlMsg | null) => void) | null>(null);

  const setPhase = useCallback((next: AiStreamState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopLoop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const waitForCtl = useCallback(
    (
      timeoutMs: number,
      accept?: (msg: AiCtlMsg) => boolean,
    ): Promise<AiCtlMsg | null> =>
      new Promise((resolve) => {
        let done = false;
        let timer: number | null = null;
        const finish = (msg: AiCtlMsg | null) => {
          if (done) return;
          // 非目标消息（迟到的 ACK / 统计行）继续等待，不误判握手成功
          if (msg !== null && accept && !accept(msg)) return;
          done = true;
          if (timer !== null) window.clearTimeout(timer);
          if (handshakeRef.current === finish) handshakeRef.current = null;
          resolve(msg);
        };
        handshakeRef.current = finish;
        timer = window.setTimeout(() => finish(null), timeoutMs);
      }),
    [],
  );

  /* ---------- ai_ctl 分发 ---------- */
  const handleCtl = useCallback((msg: AiCtlMsg) => {
    handshakeRef.current?.(msg);

    const kind = String(msg.kind ?? "");

    // hello（或首个带尺寸的控制行）→ 记录能力
    if (
      kind === "hello" ||
      (helloRef.current === null &&
        typeof msg.w === "number" &&
        typeof msg.h === "number")
    ) {
      const next: AiHello = {
        w: Number(msg.w ?? 0),
        h: Number(msg.h ?? 0),
        formats: Array.isArray(msg.formats) ? msg.formats.map(Number) : [1],
        chunkPayload: Number(msg.chunk_payload ?? AI_CHUNK_USB),
        maxPayload: numOrNull(msg.max_payload),
        maxRawPayload: numOrNull(msg.max_raw_payload),
        version: numOrNull(msg.version),
        freeSlots: numOrNull(msg.free_slots),
      };
      helloRef.current = next;
      setHello(next);
    }

    // ACK / NACK / busy：释放一个在途名额。
    // 固件未在文档中固定 ACK 的 kind 字符串，因此优先按 frame_id 匹配；
    // 匹配不到时再按 ack/nack/busy 兜底。
    const ackFrameId =
      typeof msg.frame_id === "number" ? msg.frame_id : null;
    let released = false;
    if (
      kind !== "hello" &&
      ackFrameId !== null &&
      pendingIdsRef.current.has(ackFrameId)
    ) {
      pendingIdsRef.current.delete(ackFrameId);
      inflightRef.current = Math.max(0, inflightRef.current - 1);
      released = true;
    } else if (kind === "ack" || kind === "nack" || kind === "busy") {
      inflightRef.current = Math.max(0, inflightRef.current - 1);
      released = true;
    }

    if (released) {
      if (msg.result === AI_RESULT.BUSY) holdRef.current = true;
      else if (msg.result === AI_RESULT.OK) holdRef.current = false;
    }

    if (msg.result === AI_RESULT.SIZE) {
      setError({
        kind: "sizeMismatch",
        message: "device rejected frame size",
        detail: `${msg.w ?? "?"}×${msg.h ?? "?"}`,
      });
    } else if (msg.result === AI_RESULT.CRC) {
      setError({ kind: "encode", message: "device rejected frame CRC" });
    }

    setStats((prev) => ({
      ...prev,
      inflight: inflightRef.current,
      framesSent: framesSentRef.current,
      lastResult: typeof msg.result === "number" ? msg.result : prev.lastResult,
      fps: typeof msg.fps_x10 === "number" ? msg.fps_x10 / 10 : prev.fps,
      bytesPerSec:
        typeof msg.bytes_per_sec === "number"
          ? msg.bytes_per_sec
          : prev.bytesPerSec,
      dropped: typeof msg.dropped === "number" ? msg.dropped : prev.dropped,
      freeSlots:
        typeof msg.free_slots === "number" ? msg.free_slots : prev.freeSlots,
    }));
  }, []);

  useEffect(() => onAiCtl(handleCtl), [onAiCtl, handleCtl]);

  /* ---------- 发送一帧 ---------- */
  const sendFrame = useCallback(
    async (jpeg: Uint8Array) => {
      const hq = optsRef.current.highQuality;
      const frameId = frameIdRef.current;
      frameIdRef.current = (frameId + 1) & 0xffff;
      // hello 已到达时按其 chunk_payload 分片（USB 固件回报 4096）
      const helloChunk = helloRef.current?.chunkPayload ?? 0;
      const chunkPayload = helloChunk > 0 ? helloChunk : AI_CHUNK_USB;
      const packets = encodeFrame(
        frameId,
        jpeg,
        chunkPayload,
        hq ? 856 : 428,
        hq ? 284 : 142,
        hq,
      );
      // 先占一个在途名额：ACK 可能在最后一个 write 的微任务之前就到达
      inflightRef.current += 1;
      pendingIdsRef.current.add(frameId);
      setStats((prev) => ({ ...prev, inflight: inflightRef.current }));
      try {
        for (const pkt of packets) {
          await writeRaw(pkt);
        }
      } catch (e) {
        pendingIdsRef.current.delete(frameId);
        inflightRef.current = Math.max(0, inflightRef.current - 1);
        setStats((prev) => ({ ...prev, inflight: inflightRef.current }));
        throw e;
      }
      framesSentRef.current += 1;
      setStats((prev) => ({
        ...prev,
        inflight: inflightRef.current,
        framesSent: framesSentRef.current,
      }));
    },
    [writeRaw],
  );

  /**
   * 发送 12B PING 控制帧（type=4, kind=1）：固件 AiFrameProtocol 收帧后回 ACK，
   * 用于确认「设备停在 AI 页 + 二进制通道可用」。
   * 控制帧不参与固件的 frame_id 序号校验，因此这里不推进 frameIdRef，
   * 避免后续首帧出现序号跳变被拒（result=2）。
   */
  const sendPing = useCallback(async (): Promise<number> => {
    const frameId = frameIdRef.current;
    const packets = encodeControlFrame(AI_CONTROL_KIND_PING, 0, 0, 0, frameId);
    for (const pkt of packets) {
      await writeRaw(pkt);
    }
    return frameId;
  }, [writeRaw]);

  const fail = useCallback(
    (err: AiStreamError) => {
      stopLoop();
      setError(err);
      setPhase("failed");
      resumeHeartbeat();
      setAiStreaming(false);
    },
    [resumeHeartbeat, setAiStreaming, setPhase, stopLoop],
  );

  /* ---------- 握手 ---------- */
  const connect = useCallback(async () => {
    if (!connected) {
      setError({ kind: "disconnected", message: "device not connected" });
      return;
    }
    if (readState(stateRef) !== "idle" && readState(stateRef) !== "failed") {
      return;
    }

    setError(null);
    // 清理上一轮残留（失败重试时可能有迟到的 ACK / 在途计数）
    stopLoop();
    sendingRef.current = false;
    holdRef.current = false;
    inflightRef.current = 0;
    pendingIdsRef.current.clear();
    helloRef.current = null;
    setHello(null);

    setPhase("handshake");
    pauseHeartbeat();
    setAiStreaming(true);

    try {
      // 1) 裸 '\n' 探针：AiSerialLink 置位 handshake_request_，AiMode 补发 hello。
      //    固件补发受 1s 限流且 takeHandshakeRequest() 读即清零，单发可能被吞，
      //    因此跨限流窗口重试（HELLO_WAIT_MS > 1s）。
      let helloMsg: AiCtlMsg | null = null;
      for (let i = 0; i < HELLO_PROBES && helloMsg === null; i++) {
        if (readState(stateRef) !== "handshake") return;
        await writeRaw(new Uint8Array([0x0a]));
        helloMsg = await waitForCtl(
          HELLO_WAIT_MS,
          (m) => String(m.kind ?? "") === "hello",
        );
      }

      if (readState(stateRef) !== "handshake") return;

      // 2) hello 未到：用 PING 控制帧确认 AI 页与二进制通道。
      //    注意进入二进制态会清 handshake_request_，之后不会再有 hello，
      //    故以 result=OK 的 ACK 作为退化握手成功（跳过 hello 能力校验）。
      if (helloMsg === null) {
        const pingId = await sendPing();
        const ack = await waitForCtl(
          PROBE_WAIT_MS,
          (m) => String(m.kind ?? "") === "ack" && m.frame_id === pingId,
        );
        if (!ack) {
          throw Object.assign(
            new Error("no ai_ctl hello or ping ack received"),
            { kind: "notOnAiPage" },
          );
        }
        if (ack.result !== AI_RESULT.OK) {
          throw Object.assign(
            new Error(
              `device rejected handshake ping (result=${ack.result ?? "?"})`,
            ),
            { kind: "notOnAiPage" },
          );
        }
      }

      if (readState(stateRef) !== "handshake") return;

      // 3) hello 能力校验（docs §3.3：formats 含 JPEG、尺寸 428×142 / 856×284）
      if (helloRef.current) {
        const problem = helloProblem(helloRef.current);
        if (problem) {
          throw Object.assign(new Error(problem), { kind: "unsupported" });
        }
      }

      setPhase("ready");
      // 握手完成即恢复心跳 / 配置命令；推流与单帧推送会再次成对暂停
      resumeHeartbeat();
      setAiStreaming(false);
    } catch (e) {
      if (readState(stateRef) === "handshake") {
        fail(toAiError(e, "notOnAiPage"));
      }
    }
  }, [
    connected,
    fail,
    pauseHeartbeat,
    resumeHeartbeat,
    sendPing,
    setAiStreaming,
    setPhase,
    stopLoop,
    waitForCtl,
    writeRaw,
  ]);

  /* ---------- 单帧推送 ---------- */
  const pushOnce = useCallback(async () => {
    if (stateRef.current !== "ready") return;
    if (inflightRef.current >= MAX_INFLIGHT) {
      setError({ kind: "busy", message: "2 frames still in flight" });
      return;
    }

    setError(null);
    pauseHeartbeat();
    setAiStreaming(true);
    try {
      const jpeg = await optsRef.current.makeJpeg(optsRef.current.highQuality);
      await sendFrame(jpeg);
      // 等 ACK 或超时；期间保持心跳静默，避免 JSON 混入帧流
      await waitForCtl(PUSH_ACK_WAIT_MS);
    } catch (e) {
      setError(toAiError(e, "encode"));
    } finally {
      if (readState(stateRef) !== "streaming") {
        resumeHeartbeat();
        setAiStreaming(false);
      }
    }
  }, [
    pauseHeartbeat,
    resumeHeartbeat,
    sendFrame,
    setAiStreaming,
    waitForCtl,
  ]);

  /* ---------- 循环推流 ---------- */
  const start = useCallback(() => {
    if (stateRef.current !== "ready") return;
    setError(null);
    pauseHeartbeat();
    setAiStreaming(true);
    setPhase("streaming");

    const tick = async () => {
      timerRef.current = null;
      if (stateRef.current !== "streaming") return;

      if (
        !sendingRef.current &&
        !holdRef.current &&
        inflightRef.current < MAX_INFLIGHT
      ) {
        sendingRef.current = true;
        try {
          const jpeg = await optsRef.current.makeJpeg(
            optsRef.current.highQuality,
          );
          if (stateRef.current === "streaming") await sendFrame(jpeg);
        } catch (e) {
          sendingRef.current = false;
          if (stateRef.current === "streaming") fail(toAiError(e, "encode"));
          return;
        }
        sendingRef.current = false;
      }

      if (stateRef.current === "streaming") {
        const interval = Math.max(
          MIN_FRAME_MS,
          Math.round(1000 / Math.max(MIN_FPS, fpsRef.current)),
        );
        timerRef.current = window.setTimeout(tick, interval);
      }
    };

    void tick();
  }, [fail, pauseHeartbeat, sendFrame, setAiStreaming, setPhase]);

  /** 停止循环推流，回到 Ready（恢复心跳与 JSON 命令）。 */
  const stop = useCallback(() => {
    stopLoop();
    sendingRef.current = false;
    holdRef.current = false;
    inflightRef.current = 0;
    pendingIdsRef.current.clear();
    setStats((prev) => ({ ...prev, inflight: 0 }));
    setPhase(connected ? "ready" : "idle");
    resumeHeartbeat();
    setAiStreaming(false);
  }, [connected, resumeHeartbeat, setAiStreaming, setPhase, stopLoop]);

  /** 结束整个 AI 会话（回到 Idle）。 */
  const close = useCallback(() => {
    stopLoop();
    // 取消仍在挂起的握手等待，避免 connect() 空转到期
    handshakeRef.current?.(null);
    sendingRef.current = false;
    holdRef.current = false;
    inflightRef.current = 0;
    pendingIdsRef.current.clear();
    framesSentRef.current = 0;
    helloRef.current = null;
    setHello(null);
    setStats(EMPTY_STATS);
    setError(null);
    setPhase("idle");
    resumeHeartbeat();
    setAiStreaming(false);
  }, [resumeHeartbeat, setAiStreaming, setPhase, stopLoop]);

  const setFps = useCallback((next: number) => {
    const v = Math.min(MAX_FPS, Math.max(MIN_FPS, Math.round(next)));
    fpsRef.current = v;
    setFpsState(v);
  }, []);

  /* ---------- 串口断开 → 回 Idle ---------- */
  useEffect(() => {
    if (connected) return;
    if (stateRef.current === "idle") {
      setAiStreaming(false);
      return;
    }
    stopLoop();
    sendingRef.current = false;
    inflightRef.current = 0;
    pendingIdsRef.current.clear();
    helloRef.current = null;
    setHello(null);
    setStats(EMPTY_STATS);
    setPhase("idle");
    setAiStreaming(false);
  }, [connected, setAiStreaming, setPhase, stopLoop]);

  /* ---------- 卸载：必须恢复心跳 ---------- */
  useEffect(
    () => () => {
      stopLoop();
      handshakeRef.current?.(null);
      resumeHeartbeat();
      setAiStreaming(false);
    },
    [resumeHeartbeat, setAiStreaming, stopLoop],
  );

  return {
    state,
    error,
    hello,
    stats,
    fps,
    setFps,
    connect,
    close,
    pushOnce,
    start,
    stop,
    /** 当前是否允许单帧推送 / 开始推流。 */
    canSend: state === "ready",
    streaming: state === "streaming",
  };
}
