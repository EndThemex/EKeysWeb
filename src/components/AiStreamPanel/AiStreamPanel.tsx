/**
 * AiStreamPanel — /config/ai：「AI Mode 图像推流」Tab。
 *
 * 结构对应 docs/ai-image-streaming.md §7.2：
 * 状态胶囊 / 内容源 / 推送控制 / 统计 / 预览。
 * 本组件负责 Canvas 内容管线；协议与流控在 useAiStream。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useDeviceSession } from "../../hooks/DeviceSessionContext";
import { useAiStream, type AiStreamError } from "../../hooks/useAiStream";
import { useI18n } from "../../i18n/useI18n.tsx";
import {
  ConnectButton,
  ErrorBanner,
  PanelHead,
  StatusPill,
} from "../settings/controls";
import { ContentSource } from "./ContentSource";
import { PreviewCanvas } from "./PreviewCanvas";
import { StreamStats } from "./StreamStats";
import {
  drawPreview,
  type AiSourceMode,
  type DrawState,
  type TextAlign,
} from "./draw";

const DEFAULT_TEXT = "EKEYS AI MODE\nHello, hardware";

function AiErrorBanner({ error }: { error: AiStreamError }) {
  const { t } = useI18n();
  const key = `ai.error.${error.kind}`;
  const localized = t(key);
  const headline = localized === key ? t("ai.error.unknown") : localized;
  return (
    <div className="settings-panel__error" role="alert">
      <span className="settings-panel__error-icon" aria-hidden="true">
        ⚠
      </span>
      <div className="settings-panel__error-body">
        <strong className="settings-panel__error-title">
          {headline}
          {error.detail && (
            <span className="ai-error__detail mono">{error.detail}</span>
          )}
        </strong>
        <details className="settings-panel__error-detail">
          <summary>{t("config.error.detail")}</summary>
          <code>{error.message}</code>
        </details>
      </div>
    </div>
  );
}

export function AiStreamPanel() {
  const { t } = useI18n();
  const { supported, phase, connected, error, connect, disconnect } =
    useDeviceSession();

  /* ---------- 内容源状态 ---------- */
  const [mode, setMode] = useState<AiSourceMode>("file");
  const [fileName, setFileName] = useState("");
  const [imageVersion, setImageVersion] = useState(0);
  const [screenActive, setScreenActive] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [textBg, setTextBg] = useState("#0a0a0a");
  const [textFg, setTextFg] = useState("#ff6b35");
  const [textSize, setTextSize] = useState(28);
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [highQuality, setHighQuality] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const drawStateRef = useRef<DrawState>({
    mode,
    image: null,
    video: null,
    text,
    textBg,
    textFg,
    textSize,
    textAlign,
  });
  drawStateRef.current = {
    mode,
    image: imageRef.current,
    video: videoRef.current,
    text,
    textBg,
    textFg,
    textSize,
    textAlign,
  };

  /* ---------- 内容 → JPEG（零新依赖） ---------- */
  const makeJpeg = useCallback(async (hq: boolean): Promise<Uint8Array> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("preview canvas unavailable");
    drawPreview(
      canvas,
      hq ? 856 : 428,
      hq ? 284 : 142,
      drawStateRef.current,
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("JPEG encode failed"))),
        "image/jpeg",
        0.75,
      );
    });
    return new Uint8Array(await blob.arrayBuffer());
  }, []);

  const ai = useAiStream({ makeJpeg, highQuality });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawPreview(
      canvas,
      highQuality ? 856 : 428,
      highQuality ? 284 : 142,
      drawStateRef.current,
    );
  }, [highQuality]);

  /* 源内容变化时刷新静态预览 */
  useEffect(() => {
    redraw();
  }, [
    redraw,
    mode,
    text,
    textBg,
    textFg,
    textSize,
    textAlign,
    imageVersion,
    screenActive,
  ]);

  /* 屏幕捕获：非推流时用 rAF 保持预览实时 */
  useEffect(() => {
    if (!screenActive || ai.streaming) return;
    let raf = 0;
    const loop = () => {
      redraw();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [screenActive, ai.streaming, redraw]);

  /* ---------- 文件源 ---------- */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSourceError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      imageRef.current = img;
      setFileName(file.name);
      setMode("file");
      setImageVersion((v) => v + 1);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setSourceError(t("ai.source.imageError"));
    };
    img.src = url;
  };

  /* ---------- 屏幕捕获源 ---------- */
  const stopScreen = useCallback(() => {
    const stream = screenStreamRef.current;
    screenStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScreenActive(false);
  }, []);

  const startScreen = useCallback(async () => {
    setSourceError(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setSourceError(t("ai.source.screenUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener(
        "ended",
        () => stopScreen(),
        { once: true },
      );
      setMode("screen");
      setScreenActive(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setSourceError(
        name === "NotAllowedError"
          ? t("ai.source.screenDenied")
          : t("ai.source.screenFailed"),
      );
    }
  }, [stopScreen, t]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (screenActive && screenStreamRef.current) {
      video.srcObject = screenStreamRef.current;
      void video.play().catch(() => undefined);
    }
  }, [screenActive, mode]);

  const handleModeChange = (next: AiSourceMode) => {
    if (next !== "screen") stopScreen();
    setMode(next);
  };

  /* 卸载清理 */
  useEffect(
    () => () => {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const sourceReady =
    mode === "file" ? imageVersion > 0 : mode === "screen" ? screenActive : true;
  const notConnected = !connected;

  return (
    <section className="settings-panel ai-panel">
      <PanelHead
        eyebrow={t("ai.eyebrow")}
        title={t("ai.title")}
        lede={t("ai.lede")}
        right={
          <ConnectButton
            phase={phase}
            supported={supported}
            connected={connected}
            onConnect={() => void connect().catch(() => undefined)}
            onDisconnect={() => void disconnect().catch(() => undefined)}
            t={t}
          />
        }
      />

      <StatusPill phase={phase} connected={connected} t={t} />

      {!supported && (
        <ErrorBanner error={{ kind: "unsupported", message: "" }} t={t} />
      )}
      {error && <ErrorBanner error={error} t={t} />}
      {ai.error && <AiErrorBanner error={ai.error} />}

      <div
        className={`ai-statebar ai-statebar--${ai.state}`}
        role="status"
        aria-live="polite"
      >
        <span className="ai-statebar__dot" aria-hidden="true" />
        <strong className="ai-statebar__label">
          {t(`ai.state.${ai.state}`)}
        </strong>
        {ai.state === "streaming" && (
          <span className="ai-statebar__hint">{t("ai.hint.serialPaused")}</span>
        )}
        {ai.hello && (
          <span className="ai-statebar__meta mono">
            {ai.hello.w}×{ai.hello.h}
            {ai.hello.version !== null ? ` · v${ai.hello.version}` : ""}
          </span>
        )}
      </div>

      {notConnected && <p className="hint">{t("ai.hint.connectFirst")}</p>}

      <div className="ai-layout">
        <div className="ai-column">
          <ContentSource
            mode={mode}
            onModeChange={handleModeChange}
            fileInputRef={fileInputRef}
            fileName={fileName}
            onPickFile={() => fileInputRef.current?.click()}
            onFileChange={handleFileChange}
            text={text}
            onTextChange={setText}
            textBg={textBg}
            onTextBgChange={setTextBg}
            textFg={textFg}
            onTextFgChange={setTextFg}
            textSize={textSize}
            onTextSizeChange={setTextSize}
            textAlign={textAlign}
            onTextAlignChange={setTextAlign}
            screenActive={screenActive}
            onStartScreen={() => void startScreen()}
            onStopScreen={stopScreen}
            videoRef={videoRef}
            error={sourceError}
            disabled={!connected || ai.state === "handshake"}
          />

          <section className="ai-card" aria-label={t("ai.action.label")}>
            <div className="ai-card__head">
              <span className="eyebrow">{t("ai.action.label")}</span>
            </div>

            <div className="ai-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void ai.pushOnce()}
                disabled={!ai.canSend || !sourceReady}
              >
                {t("ai.action.pushOnce")}
              </button>

              {ai.streaming ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={ai.stop}
                >
                  {t("ai.action.stop")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={ai.start}
                  disabled={!ai.canSend || !sourceReady}
                >
                  {t("ai.action.start")}
                </button>
              )}

              {ai.state === "idle" || ai.state === "failed" ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void ai.connect()}
                  disabled={!connected}
                >
                  {t("ai.action.handshake")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={ai.close}
                >
                  {t("ai.action.close")}
                </button>
              )}
            </div>

            <label className="ai-field ai-field--range">
              <span className="ai-field__label">{t("ai.field.fps")}</span>
              <input
                type="range"
                min={1}
                max={20}
                value={ai.fps}
                onChange={(e) => ai.setFps(Number(e.target.value))}
              />
              <span className="ai-field__value mono">{ai.fps}</span>
            </label>

            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={highQuality}
                onChange={(e) => setHighQuality(e.target.checked)}
              />
              <span>{t("ai.field.highQuality")}</span>
            </label>
          </section>
        </div>

        <div className="ai-column">
          <PreviewCanvas
            canvasRef={canvasRef}
            label={t("ai.preview.title")}
            note={t("ai.preview.note")}
          />
          <StreamStats stats={ai.stats} />
        </div>
      </div>

      <p className="hint">{t("ai.hint.wifi")}</p>
    </section>
  );
}
