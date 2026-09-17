import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Keyboard3D from "../components/Keyboard3D";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * ShowcasePage — 单页产品展示
 *
 * 设计思路：
 *  - 5 个功能模块，自动轮播 6 秒，可手动点旋钮 / 进度条跳转
 *  - 键盘模型常驻舞台中央固定位置,大小随屏幕缩放
 *  - 三栏 grid:左文案 + 中键盘 + 右视觉元素,任意分辨率都保证两侧内容完整
 *  - 全部动画走 transform / opacity,禁用时会自动缩短时长
 */
type Anchor = "left" | "right";
type FeatureId = 1 | 2 | 3 | 4 | 5;
const FEATURE_IDS: FeatureId[] = [1, 2, 3, 4, 5];

/** 视觉区在右侧的展示风格(每个功能不同) */
const VISUAL_LAYOUTS: Record<FeatureId, "inline" | "stack"> = {
  1: "stack", // Profile chips 弧形
  2: "stack", // Keymap 键帽网格
  3: "stack", // RGB 色块
  4: "stack", // Voice 录音条
  5: "stack", // Companion 连线图
};

/** 屏幕显示的"剧情锚点"文案 */
const SCREEN_LINES: Record<FeatureId, string> = {
  1: "PROFILE 3 · OFFICE",
  2: "KEY 7  →  CTRL + C",
  3: "RAINBOW WAVE · 80%",
  4: "● REC · LISTENING…",
  5: "TCP 30000 · LINK OK",
};

const AUTO_INTERVAL_MS = 6000;

export default function ShowcasePage() {
  const { t, tag } = useI18n();
  const [current, setCurrent] = useState<FeatureId>(1);
  const [animKey, setAnimKey] = useState(0); // 触发文案 stagger 重置
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100

  const autoTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());
  const reducedMotion = useRef(false);

  // 读取 prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq) {
      reducedMotion.current = mq.matches;
      const onChange = () => (reducedMotion.current = mq.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }
    return undefined;
  }, []);

  const goTo = (next: FeatureId) => {
    if (next === current) return;
    setCurrent(next);
    setAnimKey((k) => k + 1);
    setProgress(0);
    lastTickRef.current = performance.now();
    restartAutoTimer();
  };

  const goNext = () => {
    const idx = FEATURE_IDS.indexOf(current);
    const next = FEATURE_IDS[(idx + 1) % FEATURE_IDS.length];
    goTo(next);
  };

  const goPrev = () => {
    const idx = FEATURE_IDS.indexOf(current);
    const next = FEATURE_IDS[(idx - 1 + FEATURE_IDS.length) % FEATURE_IDS.length];
    goTo(next);
  };

  const restartAutoTimer = () => {
    if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
    if (paused || reducedMotion.current) return;
    autoTimerRef.current = window.setInterval(() => {
      goNext();
    }, AUTO_INTERVAL_MS);
  };

  // 启动 / 恢复自播放 + 进度条动画
  useEffect(() => {
    lastTickRef.current = performance.now();
    setProgress(0);

    if (paused || reducedMotion.current) return undefined;

    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      setProgress((p) => {
        const next = p + (dt / AUTO_INTERVAL_MS) * 100;
        return next > 100 ? 100 : next;
      });
      progressRafRef.current = window.requestAnimationFrame(tick);
    };
    progressRafRef.current = window.requestAnimationFrame(tick);
    restartAutoTimer();

    return () => {
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
      if (progressRafRef.current)
        window.cancelAnimationFrame(progressRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused]);

  // 用户任何操作都重置自播放
  const resetAuto = () => {
    lastTickRef.current = performance.now();
    setProgress(0);
    restartAutoTimer();
  };

  // 监听键盘箭头 / 空格 → 上一项 / 下一项 / 暂停
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        resetAuto();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        resetAuto();
        goPrev();
      } else if (e.key.toLowerCase() === "p") {
        setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused]);

  // 文案 bullets(来自 i18n,标记成字符串数组)
  const bullets = tag(`showcase.feature.${current}.bullets`);

  const featureList = useMemo(
    () =>
      FEATURE_IDS.map((id) => ({
        id,
        title: t(`showcase.feature.${id}.title`),
        num: `0${id}`,
      })),
    [t],
  );

  return (
    <section className="showcase">
      {/* 顶部状态条 */}
      <header className="showcase__topbar">
        <div className="container showcase__topbar-inner">
          <span className="showcase__eyebrow">
            {t("showcase.hero.eyebrow")}
          </span>
          <span className="showcase__screenline" aria-live="polite">
            {SCREEN_LINES[current]}
          </span>
          <div className="showcase__topbar-actions">
            <button
              type="button"
              className="showcase__btn"
              onClick={() => {
                resetAuto();
                goPrev();
              }}
              aria-label={t("showcase.status.prev")}
            >
              ‹ {t("showcase.status.prev")}
            </button>
            <button
              type="button"
              className="showcase__btn"
              onClick={() => setPaused((v) => !v)}
              aria-label={
                paused ? t("showcase.status.resume") : t("showcase.status.pause")
              }
            >
              {paused
                ? "▶ " + t("showcase.status.resume")
                : "❚❚ " + t("showcase.status.pause")}
            </button>
            <button
              type="button"
              className="showcase__btn"
              onClick={() => {
                resetAuto();
                goNext();
              }}
              aria-label={t("showcase.status.next")}
            >
              {t("showcase.status.next")} ›
            </button>
          </div>
        </div>
      </header>

      {/* 主舞台 — 三栏 grid,键盘固定中央,两侧内容随页面缩放 */}
      <div className="showcase__stage">
        <div className="showcase__grid">
          {/* 左侧:文案 */}
          <aside
            key={`copy-${animKey}`}
            className="showcase__col showcase__col--copy showcase__col--enter"
          >
            <span className="showcase__copy-num">0{current}</span>
            <h2 className="showcase__copy-title">
              {t(`showcase.feature.${current}.title`)}
            </h2>
            <p className="showcase__copy-lede">
              {t(`showcase.feature.${current}.lede`)}
            </p>
            <ul className="showcase__copy-list">
              {bullets.map((b, i) => (
                <li
                  key={b}
                  className="showcase__copy-item"
                  style={{ animationDelay: `${i * 80 + 200}ms` }}
                >
                  <span className="showcase__copy-bullet">◆</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="showcase__copy-cta">
              <Link to="/docs" className="btn btn--primary">
                {t("showcase.hero.cta.primary")}
              </Link>
              <Link to="/" className="btn btn--ghost">
                {t("showcase.hero.cta.secondary")}
              </Link>
            </div>
          </aside>

          {/* 中间:键盘模型(位置固定,大小随缩放) */}
          <div className="showcase__col showcase__col--kbd">
            <div className="showcase__kbd-wrap">
              <Keyboard3D />
              {/* 旋钮点击热区 */}
              <button
                type="button"
                className="showcase__knob-hot"
                onClick={() => {
                  resetAuto();
                  goNext();
                }}
                aria-label={t("showcase.status.next")}
                title={t("showcase.status.next")}
              >
                <span className="showcase__knob-hot-dot" />
              </button>
              {/* 屏幕文字 HTML 覆盖层 */}
              <div className="showcase__screen-overlay" aria-hidden="true">
                <ScreenOverlayText current={current} />
              </div>
            </div>
          </div>

          {/* 右侧:视觉元素 */}
          <aside
            key={`visual-${animKey}`}
            className="showcase__col showcase__col--visual showcase__col--enter"
          >
            <FeatureVisual id={current} layout={VISUAL_LAYOUTS[current]} />
          </aside>
        </div>
      </div>

      {/* 底部:旋钮指示器 + 自动播放进度条 */}
      <footer className="showcase__bottombar">
        <div className="container showcase__bottombar-inner">
          <ol className="showcase__knob-row" aria-label="features">
            {featureList.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={
                    "showcase__knob-dot" +
                    (f.id === current ? " is-active" : "")
                  }
                  onClick={() => {
                    resetAuto();
                    goTo(f.id);
                  }}
                  aria-label={f.title}
                  aria-current={f.id === current ? "true" : undefined}
                >
                  <span className="showcase__knob-dot-label">{f.num}</span>
                  <span className="showcase__knob-dot-name">{f.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="showcase__progress" aria-hidden="true">
            <span
              className="showcase__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="showcase__footer-note">{t("showcase.footer.note")}</p>
        </div>
      </footer>
    </section>
  );
}

/* ============================================================
   FeatureVisual — 每个功能对应的视觉元素
   ============================================================ */
function FeatureVisual({
  id,
  layout,
}: {
  id: FeatureId;
  layout: "inline" | "stack";
}) {
  return (
    <div className={`visual visual--${layout}`}>
      {id === 1 && <ProfileVisual />}
      {id === 2 && <KeymapVisual />}
      {id === 3 && <RgbVisual />}
      {id === 4 && <VoiceVisual />}
      {id === 5 && <CompanionVisual />}
    </div>
  );
}

function ProfileVisual() {
  return (
    <div className="visual visual--profile" aria-hidden="true">
      <span className="visual__label">8 PROFILES</span>
      <div className="visual__profile-chips">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={
              "visual__chip" + (i === 2 ? " visual__chip--active" : "")
            }
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {`P${i + 1}`}
          </span>
        ))}
      </div>
      <span className="visual__hint">keymap · RGB · theme · PC state</span>
    </div>
  );
}

function KeymapVisual() {
  const labels = [
    "F1",
    "F2",
    "F3",
    "ENC",
    "ESC",
    "TAB",
    "SPC",
    "↵",
    "⇧",
    "CTL",
    "OPT",
    "CMD",
  ];
  return (
    <div className="visual visual--keymap" aria-hidden="true">
      <span className="visual__label">11 KEYS · 3 LAYERS</span>
      <div className="visual__caps">
        {labels.map((l, i) => (
          <span
            key={i}
            className={
              "visual__cap" + (i === 6 ? " visual__cap--active" : "")
            }
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {l}
          </span>
        ))}
      </div>
      <span className="visual__hint">key / combo / macro · FUN1 · FUN2</span>
    </div>
  );
}

function RgbVisual() {
  const swatches = [
    "#ff5722",
    "#ff8a5b",
    "#ffd166",
    "#34d399",
    "#5eead4",
    "#88aaff",
    "#a78bfa",
    "#f472b6",
    "#ffffff",
  ];
  return (
    <div className="visual visual--rgb" aria-hidden="true">
      <span className="visual__label">11 LEDs · 9 MODES</span>
      <div className="visual__swatches">
        {swatches.map((c, i) => (
          <span
            key={i}
            className="visual__swatch"
            style={{
              background: c,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
      <span className="visual__hint">click highlight · flash / ripple</span>
    </div>
  );
}

function VoiceVisual() {
  return (
    <div className="visual visual--voice" aria-hidden="true">
      <span className="visual__label">PUSH-TO-TALK</span>
      <div className="visual__rec">
        <span className="visual__rec-dot" />
        REC · LISTENING
      </div>
      <div className="visual__bars">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="visual__bar"
            style={{
              animationDelay: `${i * 50}ms`,
              ["--h" as string]: `${20 + ((i * 13) % 60)}%`,
            }}
          />
        ))}
      </div>
      <div className="visual__text">「明天上午九点开会」</div>
    </div>
  );
}

function CompanionVisual() {
  const nodes = [
    { name: "PC", x: 0, y: 0 },
    { name: "PHONE", x: -40, y: -50 },
    { name: "HA", x: 40, y: -50 },
    { name: "CLOUD", x: 0, y: -90 },
  ];
  return (
    <div className="visual visual--companion" aria-hidden="true">
      <span className="visual__label">23 COMMANDS</span>
      <svg viewBox="-110 -120 220 160" className="visual__svg">
        {nodes.slice(1).map((n, i) => (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={n.x}
            y2={n.y}
            className="visual__line"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
        {nodes.map((n, i) => (
          <g
            key={n.name}
            className="visual__node"
            style={{ animationDelay: `${i * 120}ms` }}
            transform={`translate(${n.x}, ${n.y})`}
          >
            <circle r="6" />
            <text y="14" textAnchor="middle">
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <span className="visual__hint">TCP 30000 · USB CDC · 2.4G</span>
    </div>
  );
}

/* ============================================================
   ScreenOverlayText — 屏幕上打字机效果文字
   ============================================================ */
function ScreenOverlayText({ current }: { current: FeatureId }) {
  const text = SCREEN_LINES[current];
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [text]);

  return <span className="screen-overlay__text">{typed || "\u00A0"}</span>;
}