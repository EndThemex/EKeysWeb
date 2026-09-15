/**
 * AboutPanel — M2: 设备信息 / 协议版本 / 固件 / 统计。
 *
 * 只读面板，对应桌面端 panel_about。不下发任何命令，只读 snapshot。
 * 当 PROTOCOL_VERSION 与设备 version 不一致时显示警告 banner。
 */

import { useI18n } from "../i18n/useI18n.tsx";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { PROTOCOL_VERSION } from "../protocol";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";

export function AboutPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    snapshot,
    connect,
    disconnect,
  } = useDeviceSession();

  const info = snapshot.info;
  const version = snapshot.version;
  const profile = snapshot.profile;
  const fw = snapshot.firmwareInfo;

  const protocolMatch = version !== null && version === PROTOCOL_VERSION;

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

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        lede={t("about.lede")}
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

      {!connected && <p className="hint">{t("settings.empty")}</p>}

      {connected && version !== null && !protocolMatch && (
        <div className="about-banner" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>
            {t("about.protocolMismatch")}（device v{version} / app v
            {PROTOCOL_VERSION}）
          </span>
        </div>
      )}

      {connected && (
        <div className="about-grid">
          <section className="about-card card">
            <span className="eyebrow">{t("about.card.device")}</span>
            {info ? (
              <dl className="about-card__list">
                <div>
                  <dt>{t("config.field.name")}</dt>
                  <dd>{info.device_name}</dd>
                </div>
                <div>
                  <dt>{t("config.field.id")}</dt>
                  <dd className="mono">{info.device_id}</dd>
                </div>
                <div>
                  <dt>{t("config.field.firmware")}</dt>
                  <dd className="mono">v{info.firmware_version}</dd>
                </div>
              </dl>
            ) : (
              <p className="hint">—</p>
            )}
          </section>

          <section className="about-card card">
            <span className="eyebrow">{t("about.card.protocol")}</span>
            <dl className="about-card__list">
              <div>
                <dt>{t("config.field.configVersion")}</dt>
                <dd className="mono">
                  v{version ?? "—"}
                  <span
                    className={`about-card__badge about-card__badge--${protocolMatch ? "ok" : "warn"}`}
                  >
                    {protocolMatch ? t("about.match") : t("about.mismatch")}
                  </span>
                </dd>
              </div>
              <div>
                <dt>{t("about.appVersion")}</dt>
                <dd className="mono">v{PROTOCOL_VERSION}</dd>
              </div>
            </dl>
          </section>

          <section className="about-card card">
            <span className="eyebrow">{t("about.card.firmware")}</span>
            {fw ? (
              <dl className="about-card__list">
                <div>
                  <dt>{t("about.firmwareVersion")}</dt>
                  <dd className="mono">v{fw.version}</dd>
                </div>
                {fw.build_date && (
                  <div>
                    <dt>{t("about.buildDate")}</dt>
                    <dd className="mono">{fw.build_date}</dd>
                  </div>
                )}
                {fw.build_time && (
                  <div>
                    <dt>{t("about.buildTime")}</dt>
                    <dd className="mono">{fw.build_time}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="hint">{t("about.firmwareMissing")}</p>
            )}
          </section>

          <section className="about-card card">
            <span className="eyebrow">{t("about.card.profile")}</span>
            {profile ? (
              <dl className="about-card__list">
                <div>
                  <dt>{t("config.field.activeIndex")}</dt>
                  <dd>#{profile.active_profile}</dd>
                </div>
                <div>
                  <dt>{t("config.field.profileName")}</dt>
                  <dd>{profile.profile_name}</dd>
                </div>
                <div>
                  <dt>{t("config.field.profileNumber")}</dt>
                  <dd>{profile.profile_number}</dd>
                </div>
                <div>
                  <dt>{t("config.field.hasIcon")}</dt>
                  <dd>
                    {profile.has_custom_icon ? t("config.value.yes") : t("config.value.no")}
                  </dd>
                </div>
                {profile.icon_path && (
                  <div>
                    <dt>{t("config.profile.iconPath")}</dt>
                    <dd className="mono">{profile.icon_path}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="hint">—</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
