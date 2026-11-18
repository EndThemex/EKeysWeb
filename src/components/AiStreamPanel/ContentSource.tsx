import type {
  ChangeEvent,
  RefObject,
} from "react";
import { useI18n } from "../../i18n/useI18n.tsx";
import type { AiSourceMode, TextAlign } from "./draw";

export interface ContentSourceProps {
  mode: AiSourceMode;
  onModeChange: (mode: AiSourceMode) => void;

  fileInputRef: RefObject<HTMLInputElement>;
  fileName: string;
  onPickFile: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;

  text: string;
  onTextChange: (value: string) => void;
  textBg: string;
  onTextBgChange: (value: string) => void;
  textFg: string;
  onTextFgChange: (value: string) => void;
  textSize: number;
  onTextSizeChange: (value: number) => void;
  textAlign: TextAlign;
  onTextAlignChange: (value: TextAlign) => void;

  screenActive: boolean;
  onStartScreen: () => void;
  onStopScreen: () => void;
  videoRef: RefObject<HTMLVideoElement>;

  error: string | null;
  disabled?: boolean;
}

const MODES: { id: AiSourceMode; labelKey: string }[] = [
  { id: "file", labelKey: "ai.source.file" },
  { id: "text", labelKey: "ai.source.text" },
  { id: "screen", labelKey: "ai.source.screen" },
];

const ALIGNS: { id: TextAlign; labelKey: string }[] = [
  { id: "left", labelKey: "ai.text.align.left" },
  { id: "center", labelKey: "ai.text.align.center" },
  { id: "right", labelKey: "ai.text.align.right" },
];

export function ContentSource(props: ContentSourceProps) {
  const { t } = useI18n();
  const {
    mode,
    onModeChange,
    fileInputRef,
    fileName,
    onPickFile,
    onFileChange,
    text,
    onTextChange,
    textBg,
    onTextBgChange,
    textFg,
    onTextFgChange,
    textSize,
    onTextSizeChange,
    textAlign,
    onTextAlignChange,
    screenActive,
    onStartScreen,
    onStopScreen,
    videoRef,
    error,
    disabled,
  } = props;

  return (
    <section className="ai-card" aria-label={t("ai.source.label")}>
      <div className="ai-card__head">
        <span className="eyebrow">{t("ai.source.label")}</span>
      </div>

      <div className="ai-tabs" role="tablist" aria-label={t("ai.source.label")}>
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`ai-tabs__item ${mode === item.id ? "is-active" : ""}`}
            onClick={() => onModeChange(item.id)}
            disabled={disabled}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {mode === "file" && (
        <div className="ai-source">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="ai-source__file-input"
            onChange={onFileChange}
          />
          <div className="ai-source__file-row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onPickFile}
              disabled={disabled}
            >
              {fileName ? t("ai.source.replace") : t("ai.source.pick")}
            </button>
            <span className="ai-source__file mono">
              {fileName || t("ai.source.none")}
            </span>
          </div>
          <p className="hint">{t("ai.source.fileHint")}</p>
        </div>
      )}

      {mode === "text" && (
        <div className="ai-source ai-source--text">
          <textarea
            className="ai-textarea"
            value={text}
            rows={4}
            maxLength={280}
            placeholder={t("ai.text.placeholder")}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
          />
          <div className="ai-text-grid">
            <label className="ai-field">
              <span className="ai-field__label">{t("ai.text.bg")}</span>
              <input
                type="color"
                value={textBg}
                onChange={(e) => onTextBgChange(e.target.value)}
                disabled={disabled}
              />
            </label>
            <label className="ai-field">
              <span className="ai-field__label">{t("ai.text.fg")}</span>
              <input
                type="color"
                value={textFg}
                onChange={(e) => onTextFgChange(e.target.value)}
                disabled={disabled}
              />
            </label>
            <label className="ai-field ai-field--range">
              <span className="ai-field__label">{t("ai.text.size")}</span>
              <input
                type="range"
                min={12}
                max={56}
                value={textSize}
                onChange={(e) => onTextSizeChange(Number(e.target.value))}
                disabled={disabled}
              />
              <span className="ai-field__value mono">{textSize}</span>
            </label>
          </div>
          <div className="ai-segment" role="group" aria-label={t("ai.text.align")}>
            {ALIGNS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={textAlign === item.id}
                className={`ai-segment__item ${textAlign === item.id ? "is-active" : ""}`}
                onClick={() => onTextAlignChange(item.id)}
                disabled={disabled}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "screen" && (
        <div className="ai-source">
          <div className="ai-source__file-row">
            {screenActive ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onStopScreen}
              >
                {t("ai.source.screenStop")}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={onStartScreen}
                disabled={disabled}
              >
                {t("ai.source.screenStart")}
              </button>
            )}
            <span className="ai-source__file mono">
              {screenActive ? t("ai.source.screenOn") : t("ai.source.screenOff")}
            </span>
          </div>
          <p className="hint">{t("ai.source.screenHint")}</p>
          <video
            ref={videoRef}
            className="ai-source__video"
            muted
            playsInline
          />
        </div>
      )}

      {error && (
        <p className="ai-source__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
