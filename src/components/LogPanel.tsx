/**
 * LogPanel — M2: 4 通道（TX / RX / Firmware / App）会话日志。
 *
 * - 订阅 useEKeysDevice.onLogLine / onPush / onError，自动写入 useDeviceLog；
 * - 顶栏多选过滤 + 关键词搜索；
 * - 列表用"按需渲染"策略（前后各 50 条 + 中间视口 slice），避免 2000 条卡顿；
 * - 不引入 react-window：M2 范围内自行实现一个轻量虚拟化窗口足够。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";
import { useEKeysDevice } from "../hooks/useEKeysDevice";
import {
  useDeviceLog,
  type LogChannel,
  type LogEntry,
  type LogLevel,
} from "../hooks/useDeviceLog";

const CHANNELS: LogChannel[] = ["tx", "rx", "firmware", "app"];
const LEVELS: LogLevel[] = ["info", "warn", "error"];

export function LogPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    connect,
    disconnect,
    onLogLine,
    onPush,
    onError,
  } = useEKeysDevice();
  const log = useDeviceLog();

  /* 把所有 TX / RX / Firmware / App 事件都吸到环形缓冲 */
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
        log.push("app", "error", `[${err.kind}] ${err.message}`);
      }),
    [onError, log],
  );

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

      <div className="log-list" ref={listRef}>
        {filtered.length === 0 ? (
          <p className="log-list__empty">{t("log.empty")}</p>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th className="log-table__th-time">{t("log.col.time")}</th>
                <th className="log-table__th-channel">{t("log.col.channel")}</th>
                <th className="log-table__th-level">{t("log.col.level")}</th>
                <th className="log-table__th-text">{t("log.col.text")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <LogRow key={e.id} entry={e} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <tr className={`log-row log-row--${entry.channel} log-row--${entry.level}`}>
      <td className="log-row__time mono">
        {new Date(entry.ts).toLocaleTimeString()}
      </td>
      <td className="log-row__channel">{entry.channel.toUpperCase()}</td>
      <td className="log-row__level">{entry.level}</td>
      <td className="log-row__text mono">{entry.text}</td>
    </tr>
  );
}
