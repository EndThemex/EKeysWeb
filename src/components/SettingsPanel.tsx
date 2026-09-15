/**
 * SettingsPanel — M1 主交付物，READ + WRITE 全部 25 字段中的非 Tab 化部分。
 *
 * M2 拆分：
 * - Lighting 相关（rgb_mode / rgb_single_color / rgb_click_mode / rgb_brightness）
 *   → 拆到 LightingPanel（M2）
 * - Voice 相关（voice_* 字段 + 0x0c 推送订阅）
 *   → 拆到 VoicePanel（M2）
 *
 * 本文件保留：连接 / 显示 / 音频 / 电源 / Profile / PC Status + Diff 栏。
 */

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import type { DeviceInfo, ProfileState } from "../hooks/useEKeysDevice";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useDeviceDraft } from "../hooks/useDeviceDraft";
import {
  FieldMask,
  maskSensitive,
  type DeviceSettings,
  type FieldName,
  CMD,
} from "../protocol";
import {
  ConnectButton,
  DiffBar,
  ErrorBanner,
  PanelHead,
  SelectRow,
  SliderRow,
  StatusPill,
  SwitchRow,
  TextRow,
} from "./settings/controls";

const POWER_MODE_KEYS = [
  "settings.field.powerMode.0",
  "settings.field.powerMode.1",
  "settings.field.powerMode.2",
] as const;
const TFT_THEME_KEYS = [
  "settings.field.tftTheme.0",
  "settings.field.tftTheme.1",
  "settings.field.tftTheme.2",
  "settings.field.tftTheme.3",
  "settings.field.tftTheme.4",
] as const;
const WORK_MODE_KEYS = [
  "settings.field.workMode.0",
  "settings.field.workMode.1",
  "settings.field.workMode.2",
] as const;
const PC_STATUS_FLAG_KEYS = [
  "settings.pcStatus.cpu",
  "settings.pcStatus.mem",
  "settings.pcStatus.lock",
  "settings.pcStatus.net",
  "settings.pcStatus.online",
] as const;

export function SettingsPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    snapshot,
    connect,
    disconnect,
    sendCmd,
    onPush,
  } = useDeviceSession();

  const draftHook = useDeviceDraft(snapshot.config);

  /* 当 0x87 推送到达时，把 dirty 字段保留下来 */
  useEffect(() => {
    const off = onPush((frame) => {
      const cmd = frame.cmd as number;
      if (cmd === (CMD.CONFIG_GET | 0x80) && frame.data) {
        const newMask = FieldMask.all();
        const raw = maskSensitive(frame.data as DeviceSettings);
        draftHook.mergeFromPush(raw, newMask);
      }
    });
    return off;
  }, [onPush, draftHook]);

  const info = snapshot.info as DeviceInfo | null;
  const profile = snapshot.profile as ProfileState | null;
  const version = snapshot.version;
  const draft = draftHook.draft;

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  async function onApply() {
    if (!draft || !snapshot.config) return;
    const out = draftHook.consume();
    if (!out) return;
    setApplying(true);
    setApplyError(null);
    try {
      await sendCmd(CMD.CONFIG_SET, { data: { config: out.delta } });
      setSavedTick((n) => n + 1);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  function onDiscard() {
    draftHook.reset();
    setApplyError(null);
  }

  async function onConnectClick() {
    if (phase === "disconnecting") return;
    setApplyError(null);
    try {
      await connect();
    } catch {
      /* error 已写入 hook */
    }
  }

  async function onDisconnectClick() {
    try {
      await disconnect();
    } catch {
      /* disconnect 不抛 */
    }
  }

  const workModeOptions = useMemo(
    () => WORK_MODE_KEYS.map((k, i) => ({ value: i, label: t(k) })),
    [t],
  );
  const powerModeOptions = useMemo(
    () => POWER_MODE_KEYS.map((k, i) => ({ value: i, label: t(k) })),
    [t],
  );
  const tftThemeOptions = useMemo(
    () => TFT_THEME_KEYS.map((k, i) => ({ value: i, label: t(k) })),
    [t],
  );
  const profileOptions = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        value: i,
        label: `#${i}`,
      })),
    [],
  );

  function patch<K extends FieldName>(key: K, value: DeviceSettings[K]) {
    draftHook.patch({ [key]: value } as Partial<DeviceSettings>);
  }

  const dirtyCount = draftHook.dirtyMask.size();

  /* 未连接 */
  if (!connected) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("settings.eyebrow")}
          title={t("settings.title")}
          lede={t("settings.lede")}
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
        <p className="hint">{t("settings.empty")}</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("settings.eyebrow")}
          title={t("settings.title")}
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
        <p className="hint">{t("settings.empty")}</p>
      </section>
    );
  }

  const draftSafe = draft;

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        lede={t("settings.lede")}
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
      {error && <ErrorBanner error={error} t={t} />}

      {(info || profile || version !== null) && (
        <div className="settings-panel__device card">
          <span className="eyebrow">{t("config.card.info")}</span>
          <div className="settings-panel__device-row">
            {info && (
              <div>
                <h2 className="settings-panel__device-name">{info.device_name}</h2>
                <div className="settings-panel__device-id mono">{info.device_id}</div>
              </div>
            )}
            <div className="settings-panel__device-meta">
              {info && (
                <div className="settings-panel__meta-item">
                  <span className="settings-panel__meta-label">
                    {t("config.field.firmware")}
                  </span>
                  <span className="settings-panel__meta-value">
                    v{info.firmware_version}
                  </span>
                </div>
              )}
              {version !== null && (
                <div className="settings-panel__meta-item">
                  <span className="settings-panel__meta-label">
                    {t("config.field.configVersion")}
                  </span>
                  <span className="settings-panel__meta-value">v{version}</span>
                </div>
              )}
              {profile && (
                <div className="settings-panel__meta-item">
                  <span className="settings-panel__meta-label">
                    {t("config.card.profile")}
                  </span>
                  <span className="settings-panel__meta-value">
                    #{profile.active_profile} · {profile.profile_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="settings-panel__grid">
        {/* 连接 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.connection")}</h2>
          <SelectRow
            label={t("settings.field.workMode")}
            value={draftSafe.work_mode}
            options={workModeOptions}
            onChange={(v) => patch("work_mode", v as number)}
          />
          <SwitchRow
            label={t("settings.field.connectHost")}
            checked={Boolean(draftSafe.connect_host)}
            onChange={(v) => patch("connect_host", v ? 1 : 0)}
          />
          <SwitchRow
            label={t("settings.field.wifiSwitch")}
            checked={Boolean(draftSafe.wifi_switch)}
            onChange={(v) => patch("wifi_switch", v ? 1 : 0)}
          />
          <TextRow
            label={t("settings.field.wifiSsid")}
            value={draftSafe.wifi_ssid}
            onChange={(v) => patch("wifi_ssid", v)}
            placeholder="SSID"
            maxLength={32}
          />
          <TextRow
            label={t("settings.field.wifiPassword")}
            value={draftSafe.wifi_password}
            onChange={(v) => patch("wifi_password", v)}
            sensitive
            maxLength={64}
          />
        </section>

        {/* 显示 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.display")}</h2>
          <SliderRow
            label={t("settings.field.tftBrightness")}
            value={draftSafe.tft_brightness}
            min={5}
            max={100}
            onChange={(v) => patch("tft_brightness", v)}
            unit="%"
          />
          <SelectRow
            label={t("settings.field.tftTheme")}
            value={draftSafe.tft_theme}
            options={tftThemeOptions}
            onChange={(v) => patch("tft_theme", v as number)}
          />
        </section>

        {/* 音频 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.audio")}</h2>
          <SliderRow
            label={t("settings.field.deviceVolume")}
            value={draftSafe.device_volume}
            min={0}
            max={100}
            onChange={(v) => patch("device_volume", v)}
            unit="%"
          />
          <SwitchRow
            label={t("settings.field.audioEnable")}
            checked={Boolean(draftSafe.audio_enable)}
            onChange={(v) => patch("audio_enable", v ? 1 : 0)}
          />
        </section>

        {/* 电源 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.power")}</h2>
          <SelectRow
            label={t("settings.field.powerMode")}
            value={draftSafe.power_mode}
            options={powerModeOptions}
            onChange={(v) => patch("power_mode", v as number)}
          />
        </section>

        {/* Profile */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.profile")}</h2>
          <SelectRow
            label={t("settings.field.activeProfile")}
            value={draftSafe.active_keymap_profile}
            options={profileOptions}
            onChange={(v) => patch("active_keymap_profile", v as number)}
          />
          <TextRow
            label={t("settings.field.profileName")}
            value={draftSafe.active_profile_name}
            onChange={(v) => patch("active_profile_name", v)}
            maxLength={32}
          />
          <SwitchRow
            label={t("settings.field.hasCustomIcon")}
            checked={draftSafe.active_profile_has_custom_icon}
            onChange={(v) => patch("active_profile_has_custom_icon", v)}
          />
        </section>

        {/* PC Status */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("settings.section.pcStatus")}</h2>
          <p className="settings-card__hint">
            {t("settings.field.pcStatusMask")} = 0x
            {draftSafe.pc_status_mask.toString(16).padStart(4, "0")}
          </p>
          <div className="settings-card__flags">
            {PC_STATUS_FLAG_KEYS.map((key, bit) => (
              <label key={key} className="settings-flag">
                <input
                  type="checkbox"
                  checked={Boolean((draftSafe.pc_status_mask >> bit) & 1)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? draftSafe.pc_status_mask | (1 << bit)
                      : draftSafe.pc_status_mask & ~(1 << bit);
                    patch("pc_status_mask", next);
                  }}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <DiffBar
        dirtyCount={dirtyCount}
        applying={applying}
        applyError={applyError}
        saved={savedTick > 0}
        onApply={onApply}
        onDiscard={onDiscard}
        labels={{
          dirty: t("settings.dirty"),
          saved: t("settings.saved"),
          applying: t("settings.applying"),
          applyingHint: t("settings.applyingHint"),
          diffCount: t("settings.diffCount"),
          apply: t("settings.apply"),
          discard: t("settings.discard"),
          errorWrite: t("settings.errorWrite"),
        }}
      />

      <p className="hint">
        {t("settings.hintFooter")}
      </p>
    </section>
  );
}
