/**
 * LogPanel — 4 通道（TX / RX / Firmware / App）会话日志。
 *
 * - 订阅 useEKeysDevice.onTx / onLogLine / onPush / onError，自动写入 useDeviceLog；
 * - 顶栏多选过滤 + 关键词搜索 + 跟随尾部；
 * - 列表用自实现轻量虚拟化窗口：固定行高 + 滚动位置切片，只渲染视口内
 *   ± overscan 行；2000 条也不会卡顿；
 * - 不引入 react-window：当前规模自行实现一个虚拟化窗口足够。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import {
  useDeviceLog,
  type LogChannel,
  type LogEntry,
  type LogLevel,
} from "../hooks/useDeviceLog";

const CHANNELS: LogChannel[] = ["tx", "rx", "firmware", "app"];
const LEVELS: LogLevel[] = ["info", "warn", "error"];

/** 虚拟化：固定行高（含 padding + border）。改这个数时要相应调整 CSS。 */
const ROW_HEIGHT = 28;
/** 视口上下各多渲染几行，避免快速滚动时出现空白。 */
const OVERSCAN = 8;

/** 把任意值序列化成单行字符串，避免渲染成 `[object Object]`。 */
function safeStringify(v: unknown): string {
  if (v instanceof Error) return v.message || v.name || "Error";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function LogPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    connect,
    disconnect,
    onTx,
    onLogLine,
    onPush,
    onError,
  } = useDeviceSession();
  const log = useDeviceLog();

  /* 把所有 TX / RX / Firmware / App 事件都吸到环形缓冲 */
  useEffect(
    () =>
      onTx((cmd, data) => {
        const dataStr = data ? ` data=${safeStringify(data)}` : "";
        log.push("tx", "info", `→ cmd=0x${cmd.toString(16)}${dataStr}`);
      }),
    [onTx, log],
  );
  useEffect(() => onLogLine((line) => log.push("firmware", "info", line)), [onLogLine, log]);
  useEffect(
    () =>
      onPush((frame) => {
        log.push(
          "rx",
          "info",
          `← push cmd=0x${(frame.cmd as number).toString(16)} seq=${frame.seq ?? 0}`,
        );
      }),
    [onPush, log],
  );
  useEffect(
    () =>
      onError((err) => {
        // 一些 DeviceError 不算严重故障，仅作 warn
        const warnKinds = new Set(["heartbeatLost"]);
        const level = warnKinds.has(err.kind) ? "warn" : "error";
        log.push("app", level, `[${err.kind}] ${err.message}`);
      }),
    [onError, log],
  );

  /* 会话生命周期锚点：每次切到 connected / 回到 idle 都打一行 */
  useEffect(() => {
    if (phase === "connected") {
      log.push("app", "info", "[session] connected");
    } else if (phase === "idle" && connected === false) {
      // 仅在曾连上后又断开时记录；首次进入不刷
      log.push("app", "info", "[session] idle");
    }
    // 不依赖 connected（== phase==="connected"），避免重复
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* 包装 sendCmd 不容易（hook 内部已经 sendCmd 通用化），由各调用方自行 log.push */
  /* 这里仅暴露 hook 给上层可选使用——本期不做。 */

  const [filterChannels, setFilterChannels] = useState<Set<LogChannel>>(
    new Set(CHANNELS),
  );
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [follow, setFollow] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return log.entries.filter((e) => {
      if (!filterChannels.has(e.channel)) return false;
      if (filterLevel !== "all" && e.level !== filterLevel) return false;
      if (q && !e.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [log.entries, filterChannels, filterLevel, search]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    // 用户主动上滚 → 自动暂停 follow tail
    if (follow && el.scrollTop + el.clientHeight < el.scrollHeight - ROW_HEIGHT * 2) {
      setFollow(false);
    }
  };

  useEffect(() => {
    if (!follow || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filtered.length, follow]);

  async function onConnectClick() {
    try {
      await connect();
    } catch {
      /* */
    }
  }
  async function onDisconnectClick() {
    try {
      await disconnect();
    } catch {
      /* */
    }
  }

  function toggleChannel(c: LogChannel) {
    setFilterChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function exportJson() {
    const payload = JSON.stringify(filtered, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ekeys-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("log.eyebrow")}
        title={t("log.title")}
        lede={t("log.lede")}
        right={
          <ConnectButton
            phase={phase}
            supported={supported}
            connected={connected}
            onConnect={onConnectClick}
            onDisconnect={onDisconnectClick}
            t={t}
          />
        }
      />
      <StatusPill phase={phase} connected={connected} t={t} />
      {!supported && (
        <ErrorBanner error={{ kind: "unsupported", message: "" }} t={t} />
      )}
      {error && <ErrorBanner error={error} t={t} />}

      <div className="log-toolbar">
        <div className="log-toolbar__channels">
          {CHANNELS.map((c) => (
            <label key={c} className={`log-channel log-channel--${c}`}>
              <input
                type="checkbox"
                checked={filterChannels.has(c)}
                onChange={() => toggleChannel(c)}
              />
              <span>{t(`log.channel.${c}`)}</span>
              <span className="log-channel__count">
                {log.entries.filter((e) => e.channel === c).length}
              </span>
            </label>
          ))}
        </div>
        <div className="log-toolbar__filters">
          <select
            className="settings-row__select"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel | "all")}
          >
            <option value="all">{t("log.level.all")}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`log.level.${l}`)}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("log.search")}
            className="log-toolbar__search"
          />
          <label className="log-follow">
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
            />
            <span>{t("log.follow")}</span>
          </label>
        </div>
        <div className="log-toolbar__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => log.clear()}
            disabled={log.entries.length === 0}
          >
            {t("log.clear")}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={exportJson}
            disabled={filtered.length === 0}
          >
            {t("log.export")}
          </button>
        </div>
      </div>

      <div className="log-list" ref={listRef} onScroll={onScroll}>
        <div className="log-vlist__header">
          <span>{t("log.col.time")}</span>
          <span>{t("log.col.channel")}</span>
          <span>{t("log.col.level")}</span>
          <span>{t("log.col.text")}</span>
        </div>
        {filtered.length === 0 ? (
          <p className="log-list__empty">{t("log.empty")}</p>
        ) : (
          <VirtualLogList
            entries={filtered}
            scrollTop={scrollTop}
            viewportH={viewportH}
          />
        )}
      </div>
    </section>
  );
}

/* ---------- 虚拟化列表 ---------- */

interface VirtualLogListProps {
  entries: LogEntry[];
  scrollTop: number;
  viewportH: number;
}

function VirtualLogList({
  entries,
  scrollTop,
  viewportH,
}: VirtualLogListProps) {
  const totalH = entries.length * ROW_HEIGHT;

  if (viewportH <= 0) {
    // 还未挂载 / 隐藏：先简单全量渲染一次占位，避免空白
    return (
      <div className="log-vlist" style={{ height: totalH }}>
        {entries.slice(0, 50).map((e) => (
          <LogRow key={e.id} entry={e} top={0} />
        ))}
      </div>
    );
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(entries.length, start + visibleCount);
  const slice = entries.slice(start, end);

  return (
    <div className="log-vlist" style={{ height: totalH }}>
      {slice.map((e, i) => (
        <LogRow key={e.id} entry={e} top={(start + i) * ROW_HEIGHT} />
      ))}
    </div>
  );
}

function LogRow({ entry, top }: { entry: LogEntry; top: number }) {
  return (
    <div
      className={`log-row log-row--${entry.channel} log-row--${entry.level}`}
      style={{ position: "absolute", top, left: 0, right: 0, height: ROW_HEIGHT }}
    >
      <span className="log-row__time mono">
        {new Date(entry.ts).toLocaleTimeString()}
      </span>
      <span className="log-row__channel">{entry.channel.toUpperCase()}</span>
      <span className="log-row__level">{entry.level}</span>
      <span className="log-row__text mono">{entry.text}</span>
    </div>
  );
}
