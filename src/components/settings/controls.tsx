/**
 * 共享设置控件：Switch / Select / Slider / Number / Text / Status / ErrorBanner。
 *
 * 从 SettingsPanel 抽出，便于 Lighting / Voice / Profile / WiFi 等其它
 * 设置 Tab 复用。所有控件都遵守「disabled 时仍展示当前值」的设计契约，
 * 让用户在 phase=disconnecting 等过渡态也能看到设备真实数据。
 */

import { useState, type ReactNode } from "react";
import type { DeviceError, Phase } from "../../hooks/useEKeysDevice";

/* ============================================================
 * ErrorBanner — 通用错误条
 * ============================================================ */

export function ErrorBanner({
  error,
  t,
}: {
  error: DeviceError;
  t: (k: string) => string;
}) {
  const key = `config.error.${error.kind}`;
  const localized = t(key);
  const headline = localized === key ? t("config.error.unknown") : localized;
  return (
    <div className="settings-panel__error" role="alert">
      <span className="settings-panel__error-icon" aria-hidden="true">⚠</span>
      <div className="settings-panel__error-body">
        <strong className="settings-panel__error-title">{headline}</strong>
        <details className="settings-panel__error-detail">
          <summary>{t("config.error.detail")}</summary>
          <code>{error.message}</code>
        </details>
      </div>
    </div>
  );
}

/* ============================================================
 * StatusPill — 连接状态胶囊
 * ============================================================ */

export function StatusPill({
  phase,
  connected,
  t,
}: {
  phase: Phase;
  connected: boolean;
  t: (k: string) => string;
}) {
  let stateKey: "idle" | "busy" | "ok";
  let labelKey: string;
  switch (phase) {
    case "connecting":
      stateKey = "busy";
      labelKey = "status.connecting";
      break;
    case "disconnecting":
      stateKey = "busy";
      labelKey = "status.disconnecting";
      break;
    case "connected":
      stateKey = "ok";
      labelKey = "status.connected";
      break;
    default:
      stateKey = "idle";
      labelKey = "status.idle";
  }
  return (
    <div
      className={`settings-panel__status settings-panel__status--${stateKey}`}
      role="status"
      aria-live="polite"
    >
      <span className="settings-panel__status-dot" aria-hidden="true" />
      <span className="settings-panel__status-label">{t(labelKey)}</span>
      {connected && (
        <span className="settings-panel__status-hint">
          {t("status.connectedHint")}
        </span>
      )}
    </div>
  );
}

/* ============================================================
 * ConnectButton — 头部连接/断开按钮
 * ============================================================ */

export function ConnectButton({
  phase,
  supported,
  connected,
  onConnect,
  onDisconnect,
  t,
}: {
  phase: Phase;
  supported: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  t: (k: string) => string;
}) {
  const busy = phase === "connecting" || phase === "disconnecting";
  if (connected) {
    return (
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onDisconnect}
        disabled={busy}
      >
        {phase === "disconnecting"
          ? t("config.busyDisconnect")
          : t("config.disconnect")}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn--primary"
      onClick={onConnect}
      disabled={!supported || busy}
    >
      {phase === "connecting" ? t("config.busy") : t("config.connect")}
    </button>
  );
}

/* ============================================================
 * SwitchRow / SelectRow / SliderRow / NumberRow / TextRow
 * ============================================================ */

export function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="settings-row settings-row--switch">
      <span className="settings-row__label">{label}</span>
      {hint && <span className="settings-row__hint">{hint}</span>}
      <span className="settings-row__control">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="settings-row__track" aria-hidden="true" />
      </span>
    </label>
  );
}

export function SelectRow<T extends number | string>({
  label,
  value,
  options,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="settings-row settings-row--select">
      <span className="settings-row__label">{label}</span>
      <select
        className="settings-row__select"
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          const found = options.find((o) => String(o.value) === v);
          if (found) onChange(found.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="settings-row__hint">{hint}</span>}
    </label>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  unit?: string;
}) {
  return (
    <label className="settings-row settings-row--slider">
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="settings-row__slider-value">
          {value}
          {unit ? <span className="settings-row__slider-unit">{unit}</span> : null}
        </span>
      </span>
    </label>
  );
}

export function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  unit?: string;
}) {
  return (
    <label className="settings-row settings-row--number">
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__number-wrap">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        {unit && <span className="settings-row__unit">{unit}</span>}
      </span>
    </label>
  );
}

export function TextRow({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  sensitive,
  maxLength,
  monospace,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  sensitive?: boolean;
  maxLength?: number;
  monospace?: boolean;
  hint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  // 只有当设备返回的 "***" 且用户未显式揭示时，按钮才让用户切到明文显示
  const showAsPassword = sensitive && !revealed && value !== "***";
  const maskedEmpty = sensitive && !revealed && value === "***";
  return (
    <label className="settings-row settings-row--text">
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__text-wrap">
        <input
          type={showAsPassword ? "password" : "text"}
          value={maskedEmpty ? "" : value}
          placeholder={placeholder ?? (sensitive ? "••••••" : undefined)}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={sensitive ? "new-password" : "off"}
          className={monospace ? "mono" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {sensitive && (
          <button
            type="button"
            className="settings-row__text-toggle"
            onClick={() => setRevealed((v) => !v)}
            disabled={disabled}
            title={revealed ? "Hide" : "Show"}
          >
            {revealed ? "🙈" : "👁"}
          </button>
        )}
      </span>
      {hint && <span className="settings-row__hint">{hint}</span>}
    </label>
  );
}

/* ============================================================
 * DiffBar — 草稿应用条
 * ============================================================ */

export function DiffBar({
  dirtyCount,
  applying,
  applyError,
  saved,
  onApply,
  onDiscard,
  labels,
}: {
  dirtyCount: number;
  applying: boolean;
  applyError: string | null;
  saved: boolean;
  onApply: () => void;
  onDiscard: () => void;
  labels: {
    dirty: string;
    saved: string;
    applying: string;
    applyingHint: string;
    diffCount: string;
    apply: string;
    discard: string;
    errorWrite: string;
  };
}) {
  const isDirty = dirtyCount > 0;
  return (
    <div
      className={`settings-diff ${isDirty ? "settings-diff--active" : ""}`}
      aria-live="polite"
    >
      <div className="settings-diff__status">
        {applying ? (
          <>
            <span className="settings-diff__spinner" aria-hidden="true" />
            <span>{labels.applying}</span>
            <span className="settings-diff__hint">{labels.applyingHint}</span>
          </>
        ) : isDirty ? (
          <>
            <span className="settings-diff__dot" aria-hidden="true" />
            <span>{labels.dirty}</span>
            <span className="settings-diff__hint">
              {labels.diffCount} ({dirtyCount})
            </span>
          </>
        ) : saved ? (
          <>
            <span className="settings-diff__check" aria-hidden="true">✓</span>
            <span>{labels.saved}</span>
          </>
        ) : null}
      </div>
      {applyError && (
        <div className="settings-diff__error">
          {labels.errorWrite}：{applyError}
        </div>
      )}
      <div className="settings-diff__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onDiscard}
          disabled={!isDirty || applying}
        >
          {labels.discard}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onApply}
          disabled={!isDirty || applying}
        >
          {applying ? labels.applying : labels.apply}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * PanelHead — 顶部 head 块（eyebrow / title / lede + connect button）
 * ============================================================ */

export function PanelHead({
  eyebrow,
  title,
  lede,
  right,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  right?: ReactNode;
}) {
  return (
    <header className="settings-panel__head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede && <p className="settings-panel__lede">{lede}</p>}
      </div>
      {right}
    </header>
  );
}
