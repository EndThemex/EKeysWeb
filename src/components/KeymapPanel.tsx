/**
 * KeymapPanel — M3 主面板：键位编辑 + Profile 切换 + Profile 重命名 + Profile 图标上传。
 *
 * 数据流：
 *  - 进入页面 / 切 Profile：sendCmd(CMD.KEYMAP_GET, { profile }) 拉取该 Profile 映射
 *    （响应带顶层 profile / fun_key1 / fun_key2）；
 *  - 编辑：本地 useKeymap 草稿模型（layer 0/1/2 = Base/FUN1/FUN2）；
 *  - 应用：sendCmd(CMD.KEYMAP_SET, buildKeymapSetPayload(...)) 整表下发三层 +
 *    变更过的 fun_key；
 *  - 重命名：sendCmd(CMD.PROFILE_NAME_SET, { profile, name })；
 *  - 图标上传：<input type=file> → ArrayBuffer → base64 → sendCmd(0x11)；
 *  - Profile 切换（设备）：sendCmd(0x08 CONFIG_SET, active_keymap_profile) → 0x10 refresh；
 *  - 0x87 推送：用 snapshot 同步 profile 名 / icon flag（mergeFromPush 由 useDeviceDraft 负责）。
 *
 * 模型限制：
 *  - Media / Mouse / LayerSwitch 固件当前不解析（function 通道仅支持内建功能串），
 *    下次 GET 会被还原为 unbound —— UI 已通过 "firmwareLoss" 提示告知；
 *  - 宏序列 / 文本注入 / 内建功能 / 组合键均为固件原生支持，可无损回读；
 *  - layer 3（Custom）仅本地占位。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import {
  ConnectButton,
  DiffBar,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";
import { KeyGrid } from "./KeymapEditor/KeyGrid";
import { KeyBindingPicker } from "./KeymapEditor/KeyBindingPicker";
import { LayerSelector } from "./KeymapEditor/LayerSelector";
import { ProfileSwitcher } from "./KeymapEditor/ProfileSwitcher";
import type { DeviceSnapshot } from "../hooks/useEKeysDevice";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useKeymap } from "../hooks/useKeymap";
import {
  CMD,
  applyFirmwareEntries,
  buildKeymapSetPayload,
  clampFunKey,
  emptyKeymapData,
  LAYER_BASE,
  PHYSICAL_KEY_COUNT,
  SYNCED_LAYERS,
  type FirmwareKeyEntry,
  type KeyAction,
  type KeymapData,
  clampProfile,
} from "../protocol";

/** 设备侧 Profile 图标最大字节数（设计文档 §10 / EKeysApp 桌面端约定）。 */
const ICON_MAX_BYTES = 32 * 1024;
/** Profile 名最大字节数。 */
const PROFILE_NAME_MAX_BYTES = 32;

export function KeymapPanel() {
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

  /* ---------- KeymapData 本地状态 ---------- */
  const initial = useMemo<KeymapData | null>(() => {
    if (!snapshot.profile) return null;
    const km: KeymapData = emptyKeymapData();
    km.activeProfile = clampProfile(snapshot.profile.active_profile);
    km.profileName = snapshot.profile.profile_name ?? "";
    km.hasCustomIcon = Boolean(snapshot.profile.has_custom_icon);
    return km;
  }, [snapshot.profile]);

  const km = useKeymap(initial, snapshot.config);

  const [layer, setLayer] = useState(LAYER_BASE);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const [profileBusy, setProfileBusy] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);

  // 切换 Profile 时清掉 layer 选择与 dirty
  const activeProfile = km.draft?.activeProfile ?? 0;
  useEffect(() => {
    setSelectedSlot(null);
  }, [activeProfile]);

  /* ---------- 进入页面 / 收到 profile 推送时拉 KEYMAP_GET ---------- */
  const lastFetchedProfile = useRef<number | null>(null);
  useEffect(() => {
    if (!connected || !km.draft) return;
    const prof = km.draft.activeProfile;
    if (lastFetchedProfile.current === prof) return;
    let cancelled = false;
    (async () => {
      try {
        // data.profile（0..7）：定向拉取该 Profile（缺省 = 当前激活）
        const frame = await sendCmd<Record<string, unknown>>(CMD.KEYMAP_GET, {
          data: { profile: prof },
        });
        if (cancelled) return;
        const arr = extractKeymapArray(frame);
        const base: KeymapData = km.draft ?? emptyKeymapData();
        const next = applyFirmwareEntries(base, arr, {
          profile: typeof frame.profile === "number" ? frame.profile : undefined,
          funKey1:
            typeof frame.fun_key1 === "number" ? clampFunKey(frame.fun_key1) : undefined,
          funKey2:
            typeof frame.fun_key2 === "number" ? clampFunKey(frame.fun_key2) : undefined,
        });
        km.syncFromSnapshot(next);
        lastFetchedProfile.current = prof;
      } catch (e) {
        // 旧固件可能未实现；只记录一次，不打断用户
        // eslint-disable-next-line no-console
        console.warn("[Keymap] KEYMAP_GET failed:", e);
        lastFetchedProfile.current = prof;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, km.draft?.activeProfile]);

  /* ---------- 0x87 / 0x10 推送：同步 Profile 元信息 ---------- */
  useEffect(() => {
    const off = onPush((frame) => {
      const cmd = frame.cmd as number;
      if (cmd === CMD.PROFILE_STATE) {
        const prof = (frame.profile_state as DeviceSnapshot["profile"]) ?? null;
        if (prof && km.draft) {
          km.syncFromSnapshot({
            ...km.draft,
            activeProfile: clampProfile(prof.active_profile),
            profileName: prof.profile_name ?? "",
            hasCustomIcon: Boolean(prof.has_custom_icon),
          });
          lastFetchedProfile.current = null; // 触发重新 GET
        }
      }
    });
    return off;
  }, [onPush, km]);

  /* ---------- 应用 keymap ---------- */
  async function onApply() {
    if (!km.draft) return;
    setApplying(true);
    setApplyError(null);
    try {
      // 0x08：draft 正在编辑的 Profile 与设备激活不一致时先切设备 Profile，
      // 否则 0x06 整表会写进设备当前激活的方案（与 App 端 apply_keymap
      // 先 switch_device_profile 的行为一致）。
      const deviceActive = snapshot.profile?.active_profile;
      if (deviceActive !== undefined && km.draft.activeProfile !== deviceActive) {
        await sendCmd(CMD.CONFIG_SET, {
          data: { config: { active_keymap_profile: km.draft.activeProfile } },
        });
      }
      // 0x06 SET：整表覆盖 layer 0/1/2 + 变更过的 fun_key（缺省 = 保持现值）。
      // 超时对齐 App 端 4s（固件 ACK 后才做 SPIFFS 原子写，但留足余量）
      const payload = buildKeymapSetPayload(km.draft, km.snapshot);
      await sendCmd(CMD.KEYMAP_SET, { data: payload }, 4000);
      // 成功后让 snapshot 与 draft 对齐（避免「下发后立即又显示 dirty」）
      km.syncFromSnapshot(km.draft);
      setSavedTick((n) => n + 1);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  function onDiscard() {
    km.reset();
    setApplyError(null);
  }

  /* ---------- Profile 切换（设备侧） ---------- */
  async function onSwitchProfile(idx: number) {
    if (!snapshot.config) return;
    setProfileBusy(true);
    setIconError(null);
    try {
      // 通过 0x08 CONFIG_SET 写 active_keymap_profile，再 refresh
      await sendCmd(CMD.CONFIG_SET, {
        data: { config: { active_keymap_profile: idx } },
      });
      // 主动拉一次 0x10，让 snapshot.profile 立即反映
      try {
        await sendCmd(CMD.PROFILE_STATE);
      } catch {
        /* 推送可能稍后到达 */
      }
      lastFetchedProfile.current = null;
    } catch (e) {
      setApplyError(t("keymap.errorProfile") + "：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setProfileBusy(false);
    }
  }

  /* ---------- Profile 重命名（0x15） ---------- */
  async function onRename(name: string) {
    if (!km.draft) return;
    const trimmed = name.slice(0, PROFILE_NAME_MAX_BYTES);
    setProfileBusy(true);
    setIconError(null);
    try {
      await sendCmd(CMD.PROFILE_NAME_SET, {
        data: { profile: km.draft.activeProfile, name: trimmed },
      });
      km.setProfileName(trimmed);
      // 触发 0x10 刷新一次拿权威值
      try {
        await sendCmd(CMD.PROFILE_STATE);
      } catch {
        /* */
      }
    } catch (e) {
      setApplyError(t("keymap.errorName") + "：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setProfileBusy(false);
    }
  }

  /* ---------- Profile 图标上传（0x11） ---------- */
  async function onUploadIcon(file: File) {
    setProfileBusy(true);
    setIconError(null);
    try {
      if (file.size > ICON_MAX_BYTES) {
        throw new Error(`icon > ${ICON_MAX_BYTES}B`);
      }
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
        throw new Error("only png / jpg accepted");
      }
      await sendCmd(CMD.PROFILE_ICON_SET, {
        data: {
          profile: km.draft?.activeProfile ?? 0,
          image: b64,
          ext: ext === "jpeg" ? "jpg" : ext,
        },
      });
      km.setHasCustomIcon(true);
    } catch (e) {
      setIconError(
        t("keymap.errorIcon") + "：" + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function onClearIcon() {
    if (!km.draft) return;
    setProfileBusy(true);
    setIconError(null);
    try {
      await sendCmd(CMD.PROFILE_ICON_SET, {
        data: { profile: km.draft.activeProfile, image: "", ext: "" },
      });
      km.setHasCustomIcon(false);
    } catch (e) {
      setIconError(
        t("keymap.errorIcon") + "：" + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setProfileBusy(false);
    }
  }

  /* ---------- 连接 / 断开 ---------- */
  async function onConnectClick() {
    setApplyError(null);
    setIconError(null);
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

  /* ---------- 渲染 ---------- */
  if (!connected || !km.draft) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("keymap.eyebrow")}
          title={t("keymap.title")}
          lede={t("keymap.lede")}
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
        <p className="hint">{t("keymap.empty")}</p>
      </section>
    );
  }

  const draft = km.draft;
  const draftSafe = draft;

  const dirtyCount = km.dirtyKeys.length;
  const selectedAction: KeyAction =
    selectedSlot !== null
      ? draftSafe.layers[layer]?.slots[selectedSlot] ?? { kind: "unbound" }
      : { kind: "unbound" };

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("keymap.eyebrow")}
        title={t("keymap.title")}
        lede={t("keymap.lede")}
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

      <ProfileSwitcher
        data={draftSafe}
        onSelectProfile={(i) => km.setActiveProfile(i)}
        onSwitchProfile={onSwitchProfile}
        onRename={onRename}
        onUploadIcon={onUploadIcon}
        onClearIcon={onClearIcon}
        busy={profileBusy}
        labels={{
          profile: t("keymap.profile.label"),
          rename: t("keymap.profile.rename"),
          name: t("keymap.profile.name"),
          uploadIcon: t("keymap.profile.icon.upload"),
          clearIcon: t("keymap.profile.icon.clear"),
          iconHint: t("keymap.profile.iconHint"),
          iconMissing: t("keymap.profile.iconMissing"),
          applying: t("keymap.profile.applying"),
          switch: t("keymap.profile.switch"),
        }}
      />

      {iconError && <div className="settings-panel__error-icon" role="alert">{iconError}</div>}

      <LayerSelector
        layer={layer}
        selectedSlot={selectedSlot}
        funKey1={draftSafe.funKey1}
        funKey2={draftSafe.funKey2}
        onChange={setLayer}
      />

      <div className="keymap-grid-wrap">
        <div className="keymap-grid-col">
          <KeyGrid
            draft={draftSafe}
            snapshot={km.snapshot ?? draftSafe}
            layer={layer}
            selected={selectedSlot}
            dirtyKeys={km.dirtyKeys}
            funKey1={draftSafe.funKey1}
            funKey2={draftSafe.funKey2}
            onSelect={(s) => setSelectedSlot(s)}
            onClearLayer={() => {
              if (!SYNCED_LAYERS.includes(layer)) return;
              // draft-only 更新：不能走 syncFromSnapshot（会连 snapshot 一起改，
              // 导致 dirty 被吞、未下发就显示已保存）
              for (let s = 0; s < PHYSICAL_KEY_COUNT; s++) {
                km.setLayerSlot(layer, s, { kind: "unbound" });
              }
            }}
          />
        </div>
        <div className="keymap-drawer-col">
          <KeyBindingPicker
            slot={selectedSlot}
            action={selectedAction}
            onChange={(next) => {
              if (selectedSlot === null) return;
              km.setLayerSlot(layer, selectedSlot, next);
            }}
            disabled={!SYNCED_LAYERS.includes(layer)}
            allowMacro={layer === LAYER_BASE}
            funKey1={draftSafe.funKey1}
            funKey2={draftSafe.funKey2}
            onSetFunKey={km.setFunKey}
          />
        </div>
      </div>

      <DiffBar
        dirtyCount={dirtyCount}
        applying={applying}
        applyError={applyError}
        saved={savedTick > 0}
        onApply={onApply}
        onDiscard={onDiscard}
        labels={{
          dirty: t("keymap.dirty"),
          saved: t("keymap.saved"),
          applying: t("keymap.applying"),
          applyingHint: t("keymap.applyingHint"),
          diffCount: t("keymap.diffCount"),
          apply: t("keymap.apply"),
          discard: t("keymap.discard"),
          errorWrite: t("keymap.errorWrite"),
        }}
      />

      <p className="hint">{t("keymap.hintFooter")}</p>
    </section>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

/**
 * 0x05 响应里 keymap 数组所在位置：
 * - 设计文档 / 桌面端约定：响应顶层 `keymap` 数组；
 * - 兼容：放在 data.keymap（部分固件实现）。
 */
function extractKeymapArray(frame: Record<string, unknown>): FirmwareKeyEntry[] {
  const top = frame.keymap;
  if (Array.isArray(top)) return top as FirmwareKeyEntry[];
  const data = frame.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.keymap)) return data.keymap as FirmwareKeyEntry[];
  if (Array.isArray(frame.extra_keymap)) {
    return frame.extra_keymap as FirmwareKeyEntry[];
  }
  return [];
}

/** ArrayBuffer → base64（分块编码，避免大字符串一次性占用堆）。 */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}
