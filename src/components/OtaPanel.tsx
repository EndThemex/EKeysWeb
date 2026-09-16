/**
 * OtaPanel — M4 占位版本：只展示 0x0b FIRMWARE_INFO。
 *
 * 真正的 OTA 流程（设计文档 §12 / EKeysApp ota.md）牵涉：
 * - Web Crypto 计算 MD5；
 * - 一次性 HTTP 服务 / 局域网端点（浏览器无法监听端口）；
 * - 0x14 触发设备复位进入下载模式；
 * - Web Serial 直写 .bin 到 ROM。
 *
 * 这些都依赖设备侧 boot ROM 行为细节，本期先把 Tab 占位 + 设备
 * 信息面板搭出来；后续接入完整下载链路时只需在 useOtaInfo 旁
 * 扩展 useOtaWorker，本组件结构不动。
 */

import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useOtaInfo } from "../hooks/useOtaInfo";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";

export function OtaPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    connect,
    disconnect,
    sendCmd,
    onPush,
  } = useDeviceSession();

  const ota = useOtaInfo(sendCmd, onPush, connected);

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
        eyebrow={t("ota.eyebrow")}
        title={t("ota.title")}
        lede={t("ota.lede")}
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

      {connected && (
        <div className="settings-panel__grid">
          <section className="settings-card card">
            <h2 className="settings-card__title">{t("ota.card.info")}</h2>
            <div className="ota-info">
              <div className="ota-info__row">
                <span className="ota-info__label">{t("ota.field.version")}</span>
                <span className="ota-info__value mono">
                  {ota.firmwareInfo
                    ? `v${ota.firmwareInfo.version}`
                    : t("ota.value.unknown")}
                </span>
              </div>
              <div className="ota-info__row">
                <span className="ota-info__label">{t("ota.field.buildDate")}</span>
                <span className="ota-info__value mono">
                  {ota.firmwareInfo?.build_date ?? t("ota.value.unknown")}
                </span>
              </div>
              <div className="ota-info__row">
                <span className="ota-info__label">{t("ota.field.buildTime")}</span>
                <span className="ota-info__value mono">
                  {ota.firmwareInfo?.build_time ?? t("ota.value.unknown")}
                </span>
              </div>
            </div>
            <div className="ota-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void ota.refresh()}
                disabled={ota.loading}
              >
                {ota.loading ? t("ota.refreshing") : t("ota.button.refresh")}
              </button>
            </div>
            {ota.error && (
              <p className="hint hint--warn" role="alert">
                {t("ota.errorFetch")}：{ota.error}
              </p>
            )}
          </section>

          <section className="settings-card card ota-card--pending">
            <h2 className="settings-card__title">{t("ota.card.update")}</h2>
            <p className="hint">{t("ota.updateHint")}</p>
            <ul className="ota-roadmap">
              <li>
                <span className="ota-roadmap__dot" aria-hidden="true">●</span>
                <span>{t("ota.roadmap.deviceInfo")}</span>
              </li>
              <li>
                <span className="ota-roadmap__dot" aria-hidden="true">○</span>
                <span>{t("ota.roadmap.md5")}</span>
              </li>
              <li>
                <span className="ota-roadmap__dot" aria-hidden="true">○</span>
                <span>{t("ota.roadmap.reset")}</span>
              </li>
              <li>
                <span className="ota-roadmap__dot" aria-hidden="true">○</span>
                <span>{t("ota.roadmap.flash")}</span>
              </li>
            </ul>
            <p className="hint hint--warn">{t("ota.updateWarn")}</p>
          </section>
        </div>
      )}
    </section>
  );
}
