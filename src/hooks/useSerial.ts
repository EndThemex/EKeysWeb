/**
 * useSerial — 通过 Web Serial API 连接 EKeys USB CDC 串口，
 * 并按行解析 JSON 协议帧（参见 EKeys/docs/desktop-app-protocol.md）。
 *
 * 注意：
 * - 需要 Chrome / Edge 桌面版，且页面必须运行在 HTTPS 或 localhost；
 * - TinyUSB CDC 依赖 DTR，浏览器在 port.open() 时默认拉高 DTR/RTS；
 * - 串口同时承载日志和协议帧：仅以 `{` 开头的行进入解析器；
 * - close() 必须先释放 reader / writer，否则 port.close() 会抛
 *   "Cannot close port, read or write operation in progress"。
 */
export type SerialFrame = Record<string, unknown>;

export type FrameCallback = (frame: SerialFrame) => void;

export interface EKeysSerial {
  /** 写入一行 JSON 协议帧（自动追加 `\n`）。 */
  write: (line: string) => Promise<void>;
  /** 订阅解析出的协议帧，返回取消订阅函数。 */
  onFrame: (cb: FrameCallback) => () => void;
  /**
   * 彻底关闭串口。会取消读取循环、释放 reader/writer 锁、关闭 port。
   * 调用方可重复调用，后续调用是 no-op。
   */
  close: () => Promise<void>;
  /** 是否已经关闭。 */
  readonly closed: boolean;
}

/** VID = 0x303A (Espressif)，用于过滤设备列表。 */
const EKEYS_USB_FILTERS = [{ usbVendorId: 0x303a }] as const;

/** 检测浏览器是否支持 Web Serial。 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export async function connectEKeysSerial(): Promise<EKeysSerial> {
  if (!isWebSerialSupported()) {
    throw new Error("当前浏览器不支持 Web Serial，请使用 Chrome / Edge 桌面版");
  }

  const nav = navigator as unknown as {
    serial: {
      requestPort: (opts?: { filters?: unknown[] }) => Promise<SerialPort>;
    };
  };

  const port = await nav.serial.requestPort({ filters: [...EKEYS_USB_FILTERS] });
  await port.open({ baudRate: 115200 });

  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  const callbacks: FrameCallback[] = [];
  let buffer = "";
  let closed = false;

  // 必须保留 reader / writer 引用，关闭时释放锁
  const reader = port.readable!.getReader();
  const writer = port.writable!.getWriter();

  // 异步读取循环：按 \n 切帧，过滤日志，仅向订阅者分发 JSON 帧
  const readLoop = (async () => {
    try {
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          let idx = buffer.indexOf("\n");
          while (idx >= 0) {
            const line = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);
            const trimmed = line.trim();
            if (trimmed.startsWith("{")) {
              try {
                const obj = JSON.parse(trimmed) as SerialFrame;
                callbacks.forEach((cb) => cb(obj));
              } catch {
                /* 忽略坏 JSON */
              }
            }
            idx = buffer.indexOf("\n");
          }
        }
      }
    } catch {
      /* 流被关闭 */
    }
  })();

  async function close(): Promise<void> {
    if (closed) return;
    closed = true;

    // 1) 取消底层 readable，让 reader.read() 立刻返回 done
    try {
      if (port.readable) await port.readable.cancel();
    } catch {
      /* ignore */
    }
    // 2) 中断底层 writable
    try {
      if (port.writable) await port.writable.abort();
    } catch {
      /* ignore */
    }
    // 3) 释放 reader / writer 锁
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      writer.releaseLock();
    } catch {
      /* ignore */
    }
    // 4) 等待读取循环退出
    try {
      await readLoop;
    } catch {
      /* ignore */
    }
    // 5) 最后才能 close port
    try {
      await port.close();
    } catch {
      /* 串口可能已关闭 */
    }
  }

  return {
    async write(line: string) {
      if (closed) throw new Error("serial closed");
      await writer.write(encoder.encode(line));
    },
    onFrame(cb) {
      callbacks.push(cb);
      return () => {
        const i = callbacks.indexOf(cb);
        if (i >= 0) callbacks.splice(i, 1);
      };
    },
    close,
    get closed() {
      return closed;
    },
  };
}

/** 浏览器原生 SerialPort 类型的最少子集，用于避开 lib.dom 缺失的问题。 */
type SerialPort = {
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};