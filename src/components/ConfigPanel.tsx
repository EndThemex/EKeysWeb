import { useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  useEKeysDevice,
  type DeviceConfig,
  type DeviceError,
  type DeviceInfo,
  type Phase,
  type ProfileState,
} from "../hooks/useEKeysDevice";

const WORK_MODE_LABEL = ["USB", "BLE", "2.4G"];

const POWER_MODE_LABEL = ["performance", "balanced", "low-power"];
const RGB_MODE_LABEL = ["solid", "breathing", "spectrum", "reactive", "audio"];

/** 把布尔字段包成 chip；on/off 用设计 token 色，避免「#1」式裸数字。 */
function BoolChip({
  value,
  onLabel,
  offLabel,
}: {
  value: boolean | number;
  onLabel: string;
  offLabel: string;
}) {
  const on = Boolean(value);
  return (
    <span className={`chip chip--${on ? "on" : "off"}`}>
      <span className="chip__dot" aria-hidden="true" />
      {on ? onLabel : offLabel}
    </span>
  );
}

/** 把枚举值翻译成标签，未知值回退到 #N。 */
function ModeChip({
  value,
  labels,
}: {
  value: number;
  labels: readonly string[];
}) {
  const label = labels[value] ?? `#${value}`;
  return <span className="chip chip--mode">{label}</span>;
}

/** 0~N 范围的数值，渲染成带单位的小数字 chip。 */
function NumberChip({
  value,
  suffix,
}: {
  value: number;
  suffix?: string;
}) {
  return (
    <span className="chip chip--num">
      {value}
      {suffix ? <span className="chip__suffix">{suffix}</span> : null}
    </span>
  );
}

/**
 * 把连接阶段翻译为按钮文字。Connecting / Disconnecting 期间禁用按钮，
 * 避免与底层 port.open()/close() 出现竞态。
 */
function phaseLabel(phase: Phase, t: (k: string) => string): string {
  switch (phase) {
    case "connecting":
      return t("config.busy");
    case "disconnecting":
      return t("config.busyDisconnect");
    default:
      return t("config.connect");
  }
}

function ErrorBanner({ error, t }: { error: DeviceError; t: (k: string) => string }) {
  const key = `config.error.${error.kind}`;
  const localized = t(key);
  // 当某语言没填这条 key 时，t() 会原样返回 key——回退到 unknown 文案
  const headline = localized === key ? t("config.error.unknown") : localized;
  return (
    <div className="config-panel__error" role="alert">
      <span className="config-panel__error-icon" aria-hidden="true">⚠</span>
      <div className="config-panel__error-body">
        <strong className="config-panel__error-title">{headline}</strong>
        <details className="config-panel__error-detail">
          <summary>{t("config.error.detail")}</summary>
          <code>{String(error.message ?? "")}</code>
        </details>
      </div>
    </div>
  );
}

/**
 * 连接阶段提示。始终显示当前 phase + 一句简短说明，
 * 让用户对「现在能不能动」有清晰预期。
 */
function StatusPill({
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
      className={`config-panel__status config-panel__status--${stateKey}`}
      role="status"
      aria-live="polite"
    >
      <span className="config-panel__status-dot" aria-hidden="true" />
      <span className="config-panel__status-label">{t(labelKey)}</span>
      {connected && (
        <span className="config-panel__status-hint">{t("status.connectedHint")}</span>
      )}
    </div>
  );
}

export function ConfigPanel() {
  const { t } = useI18n();
  const { supported, phase, connected, error, connect, disconnect } =
    useEKeysDevice();
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [version, setVersion] = useState<number | null>(null);

  const busy = phase === "connecting" || phase === "disconnecting";

  async function onConnectClick() {
    // 断开还在进行中，不允许立刻发起新连接
    if (phase === "disconnecting") return;
    try {
      const snap = await connect();
      setInfo(snap.info);
      setConfig(snap.config);
      setProfile(snap.profile);
      setVersion(snap.version);
    } catch {
      /* 错误已写入 hook */
    }
  }

  async function onDisconnectClick() {
    // 先清 UI，再异步断开，避免用户以为「没反应」
    setInfo(null);
    setConfig(null);
    setProfile(null);
    setVersion(null);
    try {
      await disconnect();
    } catch {
      /* disconnect 不抛 */
    }
  }

  return (
    <section className="config-panel">
      <header className="config-panel__head">
        <div>
          <p className="eyebrow">{t("config.eyebrow")}</p>
          <h1>{t("config.title")}</h1>
          <p className="config-panel__lede">{t("config.lede")}</p>
        </div>
        {connected ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onDisconnectClick}
            disabled={busy}
          >
            {phase === "disconnecting"
              ? t("config.busyDisconnect")
              : t("config.disconnect")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={onConnectClick}
            disabled={!supported || busy}
          >
            {phaseLabel(phase, t)}
          </button>
        )}
      </header>

      <StatusPill phase={phase} connected={connected} t={t} />

      {!supported && <ErrorBanner error={{ kind: "unsupported", message: "" }} t={t} />}
      {error && <ErrorBanner error={error} t={t} />}

      {(info || config || profile) && (
        <div className="snapshot">
          {info && (
            <div className="snapshot__device card">
              <div className="snapshot__device-main">
                <span className="eyebrow">{t("config.card.info")}</span>
                <h2 className="snapshot__device-name">{info.device_name}</h2>
                <div className="snapshot__device-id mono">{info.device_id}</div>
              </div>
              <div className="snapshot__device-meta">
                <div className="snapshot__meta-item">
                  <span className="snapshot__meta-label">
                    {t("config.field.firmware")}
                  </span>
                  <span className="snapshot__meta-value">
                    v{info.firmware_version}
                  </span>
                </div>
                {version !== null && (
                  <div className="snapshot__meta-item">
                    <span className="snapshot__meta-label">
                      {t("config.field.configVersion")}
                    </span>
                    <NumberChip value={version} />
                  </div>
                )}
              </div>
            </div>
          )}

          {config && (
            <div className="snapshot__settings card">
              <div className="snapshot__settings-head">
                <span className="eyebrow">{t("config.card.config")}</span>
              </div>

              <div className="snapshot__sections">
                <section className="snapshot__section">
                  <h3 className="snapshot__section-title">
                    {t("config.section.connection")}
                  </h3>
                  <dl className="snapshot__grid">
                    <dt>{t("config.field.workMode")}</dt>
                    <dd>
                      <ModeChip
                        value={config.work_mode}
                        labels={WORK_MODE_LABEL}
                      />
                    </dd>
                    <dt>{t("config.field.wifi")}</dt>
                    <dd>
                      <BoolChip
                        value={config.wifi_switch}
                        onLabel={t("config.value.on")}
                        offLabel={t("config.value.off")}
                      />
                      {config.wifi_switch && config.wifi_ssid ? (
                        <span className="snapshot__sub mono">{config.wifi_ssid}</span>
                      ) : null}
                    </dd>
                    <dt>{t("config.field.connectHost")}</dt>
                    <dd>
                      <BoolChip
                        value={config.connect_host}
                        onLabel={t("config.value.yes")}
                        offLabel={t("config.value.no")}
                      />
                    </dd>
                  </dl>
                </section>

                <section className="snapshot__section">
                  <h3 className="snapshot__section-title">
                    {t("config.section.display")}
                  </h3>
                  <dl className="snapshot__grid">
                    <dt>{t("config.field.tftBrightness")}</dt>
                    <dd>
                      <NumberChip
                        value={config.tft_brightness}
                        suffix="%"
                      />
                    </dd>
                    <dt>{t("config.field.rgbBrightness")}</dt>
                    <dd>
                      <NumberChip
                        value={config.rgb_brightness}
                        suffix="%"
                      />
                    </dd>
                    <dt>{t("config.field.rgbMode")}</dt>
                    <dd>
                      <ModeChip
                        value={config.rgb_mode}
                        labels={RGB_MODE_LABEL}
                      />
                    </dd>
                  </dl>
                </section>

                <section className="snapshot__section">
                  <h3 className="snapshot__section-title">
                    {t("config.section.audio")}
                  </h3>
                  <dl className="snapshot__grid">
                    <dt>{t("config.field.volume")}</dt>
                    <dd>
                      <NumberChip value={config.device_volume} suffix="%" />
                    </dd>
                    <dt>{t("config.field.audio")}</dt>
                    <dd>
                      <BoolChip
                        value={config.audio_enable}
                        onLabel={t("config.value.on")}
                        offLabel={t("config.value.off")}
                      />
                    </dd>
                    <dt>{t("config.field.power")}</dt>
                    <dd>
                      <ModeChip
                        value={config.power_mode}
                        labels={POWER_MODE_LABEL}
                      />
                    </dd>
                  </dl>
                </section>

                <section className="snapshot__section">
                  <h3 className="snapshot__section-title">
                    {t("config.section.voice")}
                  </h3>
                  <dl className="snapshot__grid">
                    <dt>{t("config.field.voice")}</dt>
                    <dd>
                      <BoolChip
                        value={config.voice_enable}
                        onLabel={t("config.value.on")}
                        offLabel={t("config.value.off")}
                      />
                      {config.voice_enable ? (
                        <span className="snapshot__sub">
                          {t("config.field.voiceKey")}{" "}
                          <NumberChip value={config.voice_trigger_key} />
                        </span>
                      ) : null}
                    </dd>
                    <dt>{t("config.field.activeProfile")}</dt>
                    <dd>
                      <span className="chip chip--profile">
                        <span className="chip__prefix">
                          #{config.active_keymap_profile}
                        </span>
                        <span className="chip__divider" aria-hidden="true" />
                        <span className="snapshot__profile-name">
                          {config.active_profile_name}
                        </span>
                        {config.active_profile_has_custom_icon ? (
                          <span
                            className="chip__suffix-tag"
                            title={t("config.value.hasIcon")}
                          >
                            {t("config.value.hasIcon")}
                          </span>
                        ) : null}
                      </span>
                    </dd>
                  </dl>
                </section>
              </div>
            </div>
          )}

          {profile && (
            <div className="snapshot__profile card">
              <div className="snapshot__profile-main">
                <span className="eyebrow">{t("config.card.profile")}</span>
                <div className="snapshot__profile-id">
                  <span className="chip chip--profile">
                    <span className="chip__prefix">#{profile.active_profile}</span>
                    <span className="chip__divider" aria-hidden="true" />
                    <span className="snapshot__profile-name">
                      {profile.profile_name}
                    </span>
                  </span>
                </div>
              </div>
              <dl className="snapshot__profile-meta">
                <div>
                  <dt>{t("config.field.profileNumber")}</dt>
                  <dd>
                    <NumberChip value={profile.profile_number} />
                  </dd>
                </div>
                <div>
                  <dt>{t("config.profile.icon")}</dt>
                  <dd>
                    <BoolChip
                      value={profile.has_custom_icon}
                      onLabel={t("config.value.yes")}
                      offLabel={t("config.value.no")}
                    />
                  </dd>
                </div>
                {profile.has_custom_icon && profile.icon_path && (
                  <div className="snapshot__profile-path">
                    <dt>{t("config.profile.iconPath")}</dt>
                    <dd className="mono">{profile.icon_path}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      <p className="hint">{t("config.hint")}</p>
    </section>
  );
}