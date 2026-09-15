/**
 * LightingPanel — M2: RGB 灯效（rgb_mode / rgb_brightness / rgb_single_color / rgb_click_mode）。
 *
 * 4 个字段走 useDeviceDraft + DiffBar 下发 0x08，模式字段是 Select；
 * SingleColor 提供 24 格调色板（按 H/2π 离散），亮度为 Slider。
 */

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  DiffBar,
  ErrorBanner,
  PanelHead,
  SelectRow,
  SliderRow,
  StatusPill,
} from "./settings/controls";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useDeviceDraft } from "../hooks/useDeviceDraft";
import {
  FieldMask,
  maskSensitive,
  type DeviceSettings,
  type FieldName,
  CMD,
} from "../protocol";

const RGB_MODE_KEYS = [
  "settings.field.rgbMode.0",
  "settings.field.rgbMode.1",
  "settings.field.rgbMode.2",
  "settings.field.rgbMode.3",
  "settings.field.rgbMode.4",
  "settings.field.rgbMode.5",
  "settings.field.rgbMode.6",
  "settings.field.rgbMode.7",
  "settings.field.rgbMode.8",
  "settings.field.rgbMode.9",
] as const;
const RGB_CLICK_MODE_KEYS = [
  "settings.field.rgbClickMode.0",
  "settings.field.rgbClickMode.1",
  "settings.field.rgbClickMode.2",
] as const;

/** 24 色相离散调色板（HSL → CSS color）。 */
const PALETTE_24 = Array.from({ length: 24 }, (_, i) => {
  const hue = Math.round((i * 360) / 24);
  return {
    index: i,
    css: `hsl(${hue} 78% 52%)`,
  };
});

export function LightingPanel() {
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

  useEffect(() => {
    const off = onPush((frame) => {
      const cmd = frame.cmd as number;
      if (cmd === (CMD.CONFIG_GET | 0x80) && frame.data) {
        draftHook.mergeFromPush(
          maskSensitive(frame.data as DeviceSettings),
          FieldMask.all(),
        );
      }
    });
    return off;
  }, [onPush, draftHook]);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  const rgbModeOptions = useMemo(
    () => RGB_MODE_KEYS.map((k, i) => ({ value: i, label: t(k) })),
    [t],
  );
  const rgbClickModeOptions = useMemo(
    () => RGB_CLICK_MODE_KEYS.map((k, i) => ({ value: i, label: t(k) })),
    [t],
  );

  function patch<K extends FieldName>(key: K, value: DeviceSettings[K]) {
    draftHook.patch({ [key]: value } as Partial<DeviceSettings>);
  }

  const dirtyCount = draftHook.dirtyMask.size();

  async function onApply() {
    if (!draftHook.draft || !snapshot.config) return;
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

  async function onConnectClick() {
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
      /* */
    }
  }

  if (!connected || !draftHook.draft) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("settings.section.lighting")}
          title={t("lighting.title")}
          lede={t("lighting.lede")}
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

  const draftSafe = draftHook.draft;

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("settings.section.lighting")}
        title={t("lighting.title")}
        lede={t("lighting.lede")}
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

      <div className="settings-panel__grid">
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("lighting.card.mode")}</h2>
          <SelectRow
            label={t("settings.field.rgbMode")}
            value={draftSafe.rgb_mode}
            options={rgbModeOptions}
            onChange={(v) => patch("rgb_mode", v as number)}
          />
          <SliderRow
            label={t("settings.field.rgbBrightness")}
            value={draftSafe.rgb_brightness}
            min={0}
            max={100}
            onChange={(v) => patch("rgb_brightness", v)}
            unit="%"
          />
          <SelectRow
            label={t("settings.field.rgbClickMode")}
            value={draftSafe.rgb_click_mode}
            options={rgbClickModeOptions}
            onChange={(v) => patch("rgb_click_mode", v as number)}
          />
        </section>

        <section className="settings-card card">
          <h2 className="settings-card__title">{t("lighting.card.palette")}</h2>
          <p className="settings-card__hint">
            {t("lighting.paletteHint")} = #{draftSafe.rgb_single_color}
          </p>
          <div className="lighting-palette" role="radiogroup" aria-label={t("settings.field.rgbSingleColor")}>
            {PALETTE_24.map(({ index, css }) => {
              const checked = draftSafe.rgb_single_color === index;
              return (
                <button
                  type="button"
                  key={index}
                  className={`lighting-swatch ${checked ? "is-active" : ""}`}
                  style={{ background: css }}
                  aria-checked={checked}
                  role="radio"
                  onClick={() => patch("rgb_single_color", index)}
                  title={`#${index}`}
                >
                  <span className="lighting-swatch__index">#{index}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <DiffBar
        dirtyCount={dirtyCount}
        applying={applying}
        applyError={applyError}
        saved={savedTick > 0}
        onApply={onApply}
        onDiscard={() => {
          draftHook.reset();
          setApplyError(null);
        }}
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
    </section>
  );
}
