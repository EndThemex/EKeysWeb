/**
 * VoicePanel — M2: 语音转文字（voice_* 7 字段 + 0x0c 推送订阅）。
 *
 * - 配置走 useDeviceDraft + DiffBar，下发 0x08 CONFIG_SET；
 * - 实时识别结果从 snapshot.voiceTexts 取（FIFO 50 条）；
 * - 最新一条高亮并配 toast 角标；
 */

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  DiffBar,
  ErrorBanner,
  NumberRow,
  PanelHead,
  SelectRow,
  StatusPill,
  SwitchRow,
  TextRow,
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

export function VoicePanel() {
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

  const voiceKeyOptions = useMemo(
    () => [
      { value: 0, label: t("settings.voiceKey.none") },
      ...Array.from({ length: 11 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
    ],
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

  if (!connected || !draftHook.draft) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("settings.section.voice")}
          title={t("voice.title")}
          lede={t("voice.lede")}
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
  const latest = snapshot.voiceTexts[snapshot.voiceTexts.length - 1];

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("settings.section.voice")}
        title={t("voice.title")}
        lede={t("voice.lede")}
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
          <h2 className="settings-card__title">{t("voice.card.config")}</h2>
          <SwitchRow
            label={t("settings.field.voiceEnable")}
            checked={Boolean(draftSafe.voice_enable)}
            onChange={(v) => patch("voice_enable", v ? 1 : 0)}
          />
          <SelectRow
            label={t("settings.field.voiceTriggerKey")}
            value={draftSafe.voice_trigger_key}
            options={voiceKeyOptions}
            onChange={(v) => patch("voice_trigger_key", v as number)}
          />
          <NumberRow
            label={t("settings.field.voiceMaxRecordMs")}
            value={draftSafe.voice_max_record_ms}
            min={1000}
            max={60000}
            step={500}
            onChange={(v) => patch("voice_max_record_ms", v)}
            unit={t("settings.unit.ms")}
          />
          <SwitchRow
            label={t("settings.field.voiceAutoEnter")}
            checked={Boolean(draftSafe.voice_auto_enter)}
            onChange={(v) => patch("voice_auto_enter", v ? 1 : 0)}
          />
        </section>

        <section className="settings-card card">
          <h2 className="settings-card__title">{t("voice.card.credentials")}</h2>
          <TextRow
            label={t("settings.field.voiceCuid")}
            value={draftSafe.voice_cuid}
            onChange={(v) => patch("voice_cuid", v)}
            maxLength={32}
            monospace
            hint={t("voice.hint.cuid")}
          />
          <TextRow
            label={t("settings.field.voiceSecretId")}
            value={draftSafe.voice_tencent_secret_id}
            onChange={(v) => patch("voice_tencent_secret_id", v)}
            sensitive
            maxLength={64}
            monospace
          />
          <TextRow
            label={t("settings.field.voiceSecretKey")}
            value={draftSafe.voice_tencent_secret_key}
            onChange={(v) => patch("voice_tencent_secret_key", v)}
            sensitive
            maxLength={64}
            monospace
          />
        </section>
      </div>

      {/* 最新一条识别结果 + 历史列表 */}
      <section className="voice-feed card">
        <div className="voice-feed__head">
          <span className="eyebrow">{t("voice.feed.title")}</span>
          {snapshot.voiceTexts.length > 0 && (
            <span className="voice-feed__counter">
              {t("voice.feed.count")} {snapshot.voiceTexts.length}
            </span>
          )}
        </div>
        {latest ? (
          <div className="voice-feed__latest">
            <span className="voice-feed__latest-label">{t("voice.feed.latest")}</span>
            <p className="voice-feed__latest-text">{latest.text}</p>
            {latest.auto_enter && (
              <span className="voice-feed__badge">{t("voice.feed.autoEnter")}</span>
            )}
          </div>
        ) : (
          <p className="voice-feed__empty">{t("voice.feed.empty")}</p>
        )}
        {snapshot.voiceTexts.length > 1 && (
          <ul className="voice-feed__list">
            {[...snapshot.voiceTexts].reverse().slice(1).map((v) => (
              <li key={v.id} className="voice-feed__item">
                <span className="voice-feed__time mono">
                  {new Date(v.ts).toLocaleTimeString()}
                </span>
                <span className="voice-feed__text">{v.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
