/**
 * OtaPanel — 展示 0x0b FIRMWARE_INFO，并提供 0x14 进入烧录模式。
 *
 * 已接入：
 * - 0x0b 读取当前固件版本 / 构建时间；
 * - 0x14 FIRMWARE_DOWNLOAD 让设备复位进 USB-Serial-JTAG 下载模式，
 *   随后主动断开串口，把端口让给 esptool / idf.py。
 *
 * 真正的浏览器内 OTA 下载（Web Crypto MD5 + 直写 .bin）仍待接入，
 * 因此保留右侧「升级流程（规划）」卡片。
 */

import { useState } from "react";
import { CMD } from "../protocol";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useOtaInfo } from "../hooks/useOtaInfo";
import { useI18n } from "../i18n/useI18n.tsx";
import { ConfirmDialog } from "./ConfirmDialog";
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

  const [enteringFlash, setEnteringFlash] = useState(false);
  const [flashConfirmOpen, setFlashConfirmOpen] = useState(false);
  const [flashStatus, setFlashStatus] = useState<{ warn: boolean; text: string } | null>(
    null,
  );

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

  /**
   * 进入烧录模式：0x14 无 body。设备回 ACK 后约 100ms 复位进下载模式，
   * 因此无论应答是否丢失都主动断开串口，把端口让给 esptool / idf.py。
   * 仅当设备明确返回错误（旧固件不认识 0x14）时保持连接并提示失败。
   */
  async function runEnterFlashMode() {
    setEnteringFlash(true);
    setFlashStatus(null);
    try {
      await sendCmd(CMD.FIRMWARE_DOWNLOAD, undefined, 3000);
      setFlashStatus({ warn: false, text: t("ota.download.done") });
    } catch (e) {
      const kind = e instanceof Error ? (e as unknown as { kind?: string }).kind : undefined;
      if (kind === "timeout" || kind === "writeFailed" || kind === "deviceLost") {
        // 响应可能在复位瞬间丢失，设备大概率已进入下载模式。
        setFlashStatus({ warn: true, text: t("ota.download.noConfirm") });
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setFlashStatus({
          warn: true,
          text: t("ota.download.fail").replace("{error}", msg),
        });
        setEnteringFlash(false);
        setFlashConfirmOpen(false);
        return;
      }
    }

    try {
      await disconnect();
    } catch {
      /* 端口可能已随设备复位关闭 */
    }
    setEnteringFlash(false);
    setFlashConfirmOpen(false);
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

      {flashStatus && (
        <p
          className={`hint${flashStatus.warn ? " hint--warn" : ""}`}
          role={flashStatus.warn ? "alert" : "status"}
        >
          {flashStatus.text}
        </p>
      )}

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

          <section className="settings-card card">
            <h2 className="settings-card__title">{t("ota.card.download")}</h2>
            <p className="hint">{t("ota.download.desc")}</p>
            <div className="ota-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setFlashConfirmOpen(true)}
                disabled={enteringFlash}
              >
                {enteringFlash
                  ? t("ota.download.entering")
                  : t("ota.download.enter")}
              </button>
            </div>
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
                <span className="ota-roadmap__dot" aria-hidden="true">●</span>
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

      <ConfirmDialog
        open={flashConfirmOpen}
        title={t("ota.download.title")}
        message={t("ota.download.confirm")}
        confirmLabel={t("ota.download.enter")}
        cancelLabel={t("common.cancel")}
        tone="danger"
        busy={enteringFlash}
        onCancel={() => setFlashConfirmOpen(false)}
        onConfirm={() => void runEnterFlashMode()}
      />
    </section>
  );
}
