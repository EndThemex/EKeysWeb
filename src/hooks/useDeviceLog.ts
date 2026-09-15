/**
 * useDeviceLog — TX / RX / Firmware / App 四类会话日志环形缓冲。
 *
 * 设计：仅作为被动订阅者，每次 push 都触发一次 setState；
 * 渲染层在 Log Tab 中按 channel / level 过滤 + 搜索。
 * M1 范围内日志 Tab 不在路由内，只在 Settings 面板底部折一个小预览。
 */

import { useCallback, useRef, useState } from "react";

export type LogChannel = "tx" | "rx" | "firmware" | "app";
export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  ts: number;
  channel: LogChannel;
  level: LogLevel;
  text: string;
}

export interface LogFilter {
  tx?: boolean;
  rx?: boolean;
  firmware?: boolean;
  app?: boolean;
  level?: LogLevel;
  text?: string;
}

const MAX_ENTRIES = 2000;

export function useDeviceLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>({
    tx: true,
    rx: true,
    firmware: true,
    app: true,
  });
  const seqRef = useRef(1);

  const push = useCallback(
    (channel: LogChannel, level: LogLevel, text: string) => {
      setEntries((prev) => {
        const next = prev.concat({
          id: seqRef.current++,
          ts: Date.now(),
          channel,
          level,
          text,
        });
        if (next.length > MAX_ENTRIES) {
          return next.slice(next.length - MAX_ENTRIES);
        }
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, filter, setFilter, push, clear };
}
