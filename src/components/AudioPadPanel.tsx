/**
 * AudioPadPanel — M4 主交付物：音效板 0x16 文件管理 + 0x17 绑定 + 试播。
 *
 * 数据流：
 * - 进入 Tab：useAudioUploader 自动发 list + get；
 * - 上传：<input type=file> → useAudioUploader.upload()；
 *   上传期间禁用 beforeunload + 进度条 + 「取消」按钮；
 * - 绑定：从下拉里选设备文件 → bind()（乐观更新，失败回滚）；
 * - 试播：列表行尾「▶」按 file 调用 play(file)；
 * - 删除：列表行尾「×」→ 弹 confirm → deleteFile()；
 *
 * 模型限制（设计文档 §11 / EKeysApp §9.5）：
 * - 单文件 ≤ 2 MB；
 * - 文件名白名单 ^[a-z0-9_]{1,20}\\.(mp3|wav)$；浏览器侧用 sanitizeAudioFileName 派生；
 * - 11 键绑定未绑 → file = ""。
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import { useDeviceSession } from "../hooks/DeviceSessionContext";
import { useAudioUploader } from "../hooks/useAudioUploader";
import {
  AUDIO_FILE_MAX_BYTES,
  sanitizeAudioFileName,
  type AudioFileInfo,
  type AudioPadBinding,
} from "../protocol";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "./settings/controls";

export function AudioPadPanel() {
  const { t } = useI18n();
  const {
    supported,
    phase,
    connected,
    error,
    connect,
    disconnect,
    sendCmd,
  } = useDeviceSession();

  const audio = useAudioUploader(sendCmd, connected);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bindKey, setBindKey] = useState<number | null>(null);

  const usagePct = useMemo(() => {
    if (audio.usage.total <= 0) return 0;
    return Math.round((audio.usage.used / audio.usage.total) * 100);
  }, [audio.usage]);

  const fileNames = useMemo(
    () => audio.files.map((f) => f.file),
    [audio.files],
  );

  const onPickFile = useCallback(() => {
    setActionError(null);
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileRef.current) fileRef.current.value = "";
      if (!file) return;
      setActionError(null);
      try {
        await audio.upload(file);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [audio],
  );

  const onCancel = useCallback(async () => {
    setActionError(null);
    try {
      await audio.cancel();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [audio]);

  const onDelete = useCallback(
    async (name: string) => {
      setActionError(null);
      try {
        await audio.deleteFile(name);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [audio],
  );

  const onPlay = useCallback(
    async (file: string) => {
      setActionError(null);
      try {
        await audio.play(undefined, file);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [audio],
  );

  const onBind = useCallback(
    async (key: number, file: string) => {
      setActionError(null);
      try {
        await audio.bind(key, file);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [audio],
  );

  const onStop = useCallback(async () => {
    setActionError(null);
    try {
      await audio.stop();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [audio]);

  async function onConnectClick() {
    setActionError(null);
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

  if (!connected) {
    return (
      <section className="settings-panel">
        <PanelHead
          eyebrow={t("audio.eyebrow")}
          title={t("audio.title")}
          lede={t("audio.lede")}
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

  const progress = audio.progress;
  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.sent / progress.total) * 100)
      : 0;

  return (
    <section className="settings-panel">
      <PanelHead
        eyebrow={t("audio.eyebrow")}
        title={t("audio.title")}
        lede={t("audio.lede")}
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
      {actionError && (
        <div className="settings-panel__error" role="alert">
          <span className="settings-panel__error-icon" aria-hidden="true">⚠</span>
          <div className="settings-panel__error-body">
            <strong className="settings-panel__error-title">{t("audio.errorAction")}</strong>
            <code>{actionError}</code>
          </div>
        </div>
      )}

      <div className="settings-panel__grid">
        {/* 文件管理 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("audio.card.files")}</h2>
          <div className="audio-usage">
            <div className="audio-usage__bar" aria-hidden="true">
              <div
                className="audio-usage__bar-fill"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="audio-usage__meta mono">
              {formatBytes(audio.usage.used)} / {formatBytes(audio.usage.total)}{" "}
              · {t("audio.usageFree")} {formatBytes(audio.usage.free)}
            </div>
          </div>

          <div className="audio-actions">
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={onPickFile}
              disabled={audio.uploading}
            >
              {t("audio.button.upload")}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void audio.refresh()}
              disabled={audio.uploading}
            >
              {t("audio.button.refresh")}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onStop}
              disabled={audio.uploading}
            >
              {t("audio.button.stop")}
            </button>
          </div>

          <p className="hint">
            {formatI18n(t("audio.hintUpload"), {
              max: `${Math.round(AUDIO_FILE_MAX_BYTES / 1024)} KB`,
            })}
          </p>

          {progress && (
            <div className="audio-progress" aria-live="polite">
              <div className="audio-progress__head">
                <span className="mono">{progress.name}</span>
                <span className="mono">
                  {formatBytes(progress.sent)} / {formatBytes(progress.total)} · {progressPct}%
                </span>
              </div>
              <div className="audio-progress__bar" aria-hidden="true">
                <div
                  className="audio-progress__bar-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancel}
              >
                {t("audio.button.cancel")}
              </button>
            </div>
          )}

          <ul className="audio-files">
            {audio.files.length === 0 ? (
              <li className="audio-files__empty hint">{t("audio.filesEmpty")}</li>
            ) : (
              audio.files.map((f) => (
                <AudioFileRow
                  key={f.file}
                  file={f}
                  disabled={audio.uploading}
                  onPlay={() => onPlay(f.file)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        formatI18n(t("audio.confirmDelete"), { name: f.file }),
                      )
                    ) {
                      void onDelete(f.file);
                    }
                  }}
                />
              ))
            )}
          </ul>
        </section>

        {/* 11 键绑定 */}
        <section className="settings-card card">
          <h2 className="settings-card__title">{t("audio.card.pads")}</h2>
          <p className="hint">{t("audio.padsHint")}</p>
          <div className="audio-pads">
            {audio.pads.map((p) => (
              <AudioPadRow
                key={p.key}
                pad={p}
                fileNames={fileNames}
                disabled={audio.uploading}
                showSelector={bindKey === p.key}
                onToggle={() =>
                  setBindKey((cur) => (cur === p.key ? null : p.key))
                }
                onBind={(file) => onBind(p.key, file)}
                onPlay={() => onPlay(p.file)}
              />
            ))}
          </div>
        </section>
      </div>

      <p className="hint">{t("audio.hintFooter")}</p>
    </section>
  );
}

/* ============================================================
 * 子组件
 * ============================================================ */

function AudioFileRow({
  file,
  disabled,
  onPlay,
  onDelete,
}: {
  file: AudioFileInfo;
  disabled: boolean;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="audio-files__row">
      <div className="audio-files__info">
        <span className="audio-files__name mono">{file.file}</span>
        <span className="audio-files__size mono">{formatBytes(file.size)}</span>
      </div>
      <div className="audio-files__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onPlay}
          disabled={disabled}
          aria-label={t("audio.button.tryPlay")}
          title={t("audio.button.tryPlay")}
        >
          ▶
        </button>
        <button
          type="button"
          className="btn btn--ghost audio-files__delete"
          onClick={onDelete}
          disabled={disabled}
          aria-label={t("audio.button.delete")}
          title={t("audio.button.delete")}
        >
          ×
        </button>
      </div>
    </li>
  );
}

function AudioPadRow({
  pad,
  fileNames,
  disabled,
  showSelector,
  onToggle,
  onBind,
  onPlay,
}: {
  pad: AudioPadBinding;
  fileNames: string[];
  disabled: boolean;
  showSelector: boolean;
  onToggle: () => void;
  onBind: (file: string) => void;
  onPlay: () => void;
}) {
  const { t } = useI18n();
  const bound = pad.file && pad.file.length > 0;
  return (
    <div className="audio-pads__row">
      <span className="audio-pads__key mono">#{pad.key}</span>
      <span className="audio-pads__file mono">
        {bound ? pad.file : t("audio.bind.none")}
      </span>
      <div className="audio-pads__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onPlay}
          disabled={disabled || !bound}
          title={bound ? t("audio.button.playByKey") : t("audio.bind.none")}
        >
          ▶
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onToggle}
          disabled={disabled}
        >
          {showSelector ? t("audio.button.cancel") : t("audio.button.bind")}
        </button>
      </div>
      {showSelector && (
        <div className="audio-pads__selector">
          <FileSelect
            fileNames={fileNames}
            onSelect={(f) => onBind(f)}
            disabled={disabled}
            allowEmpty
            current={pad.file}
          />
        </div>
      )}
    </div>
  );
}

function FileSelect({
  fileNames,
  onSelect,
  disabled,
  allowEmpty,
  current,
}: {
  fileNames: string[];
  onSelect: (file: string) => void;
  disabled: boolean;
  allowEmpty: boolean;
  current: string;
}) {
  const { t } = useI18n();
  return (
    <div className="audio-pads__select">
      <select
        className="settings-row__select"
        value={current}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
      >
        {allowEmpty && (
          <option value="">{t("audio.bind.unbind")}</option>
        )}
        {fileNames.length === 0 ? (
          <option value="" disabled>
            {t("audio.filesEmpty")}
          </option>
        ) : (
          fileNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))
        )}
      </select>
      <span className="hint">{t("audio.hint.bindHint")}</span>
    </div>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 在没有 React 节点的纯文本字典上做 {var} 占位替换。
 * 兜底：占位不存在时返回原 key。
 */
function formatI18n(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);
}

/** 静音导入：让 TS 编译时识别 sanitize（i18n 之外的间接依赖）。 */
void sanitizeAudioFileName;
