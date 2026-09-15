/**
 * ProfileSwitcher — 顶部 Profile 控制条。
 *
 * - 8 个槽位（0..7），切换 → 立即 refresh Keymap GET（不发命令，仅 UI 同步）；
 *   真正的"切换设备 Profile"由 0x08 CONFIG_SET(active_keymap_profile) 触发，
 *   这里与 Settings Tab 共用 useDeviceDraft，逻辑在父组件装配；
 * - 重命名：本地编辑态 → "保存" 发 0x15 PROFILE_NAME_SET；
 * - 图标：选 <input type=file> → 读取 → base64 → 0x11 PROFILE_ICON_SET；
 *   清除：空 payload → 0x11。
 */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n.tsx";
import { PROFILE_COUNT, type KeymapData } from "../../protocol";

export interface ProfileSwitcherLabels {
  profile: string;
  rename: string;
  name: string;
  uploadIcon: string;
  clearIcon: string;
  iconHint: string;
  iconMissing: string;
  applying: string;
  switch: string;
}

export function ProfileSwitcher({
  data,
  onSelectProfile,
  onSwitchProfile,
  onRename,
  onUploadIcon,
  onClearIcon,
  busy,
  labels,
}: {
  data: KeymapData;
  onSelectProfile: (idx: number) => void;
  onSwitchProfile?: (idx: number) => void | Promise<void>;
  onRename?: (name: string) => void | Promise<void>;
  onUploadIcon?: (file: File) => void | Promise<void>;
  onClearIcon?: () => void | Promise<void>;
  busy?: boolean;
  labels: ProfileSwitcherLabels;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(data.profileName);

  useEffect(() => {
    if (!renameOpen) setRenameValue(data.profileName);
  }, [data.profileName, renameOpen]);

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !onUploadIcon) return;
    await onUploadIcon(f);
    // 清空 input value 以便下次同名文件也能触发
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="keymap-profile">
      <div className="keymap-profile__slots" role="tablist" aria-label={labels.profile}>
        <span className="settings-card__title">{labels.profile}</span>
        <div className="keymap-profile__buttons">
          {Array.from({ length: PROFILE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={data.activeProfile === i}
              className={`keymap-profile__btn ${
                data.activeProfile === i ? "is-active" : ""
              }`}
              onClick={() => onSelectProfile(i)}
              title={`#${i} ${data.profileName || ""}`.trim()}
            >
              #{i}
            </button>
          ))}
        </div>
      </div>

      <div className="keymap-profile__meta">
        <div className="keymap-profile__name-row">
          <span className="settings-card__title">{labels.name}</span>
          <span className="keymap-profile__name mono" title={data.profileName}>
            {data.profileName || `#${data.activeProfile}`}
          </span>
          {onRename && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setRenameOpen((v) => !v)}
              disabled={busy}
            >
              {labels.rename}
            </button>
          )}
        </div>
        {renameOpen && onRename && (
          <div className="keymap-profile__rename">
            <input
              type="text"
              className="settings-row__text-wrap"
              value={renameValue}
              maxLength={32}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={labels.name}
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={async () => {
                await onRename(renameValue.trim());
                setRenameOpen(false);
              }}
              disabled={busy}
            >
              {labels.applying === t("keymap.profile.applying")
                ? t("settings.apply")
                : t("settings.apply")}
            </button>
          </div>
        )}

        <div className="keymap-profile__icon-row">
          <span className="settings-card__title">{labels.uploadIcon}</span>
          <span className="keymap-profile__icon mono">
            {data.hasCustomIcon ? "✓" : labels.iconMissing}
          </span>
          {onUploadIcon && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={onFile}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={pickFile}
                disabled={busy}
              >
                {labels.uploadIcon}
              </button>
            </>
          )}
          {onClearIcon && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onClearIcon()}
              disabled={busy || !data.hasCustomIcon}
            >
              {labels.clearIcon}
            </button>
          )}
        </div>
        <p className="hint">{labels.iconHint}</p>

        {onSwitchProfile && (
          <button
            type="button"
            className="btn btn--ghost keymap-profile__switch"
            onClick={() => onSwitchProfile(data.activeProfile)}
            disabled={busy}
          >
            {busy ? labels.applying : labels.switch}
          </button>
        )}
      </div>
    </div>
  );
}
