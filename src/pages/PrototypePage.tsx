import { useEffect, useMemo, useRef, useState } from "react";
import KeyboardPrototype3D from "../components/KeyboardPrototype3D";
import { useI18n } from "../i18n/useI18n.tsx";

/* ============================================================
   PrototypePage — 灵感来自原型 HTML

   - 3D 键盘模型作为全屏背景层(fixed),网页内容覆盖在它上面
   - 顶部状态条(状态点 / Profile / 电量 / 时钟)
   - 底部:5 个指示点 + 自动播放进度条 + 控制按钮
   - 自动轮播 6 秒,默认暂停;键盘交互 / 进度条 / 指示点都能切换
   - 完全脱离站点外壳,全屏展示
   ============================================================ */

type FeatureId = 0 | 1 | 2 | 3 | 4;
const FEATURE_IDS: FeatureId[] = [0, 1, 2, 3, 4];

interface Feature {
  id: FeatureId;
  subtitle: string;
  title: string;
  lede: string;
  points: string[];
  screenText: string;
  copySide: "left" | "right";
  visual: VisualKind;
}

type VisualKind = "profileArc" | "keyLayers" | "rgbPalette" | "voiceWave" | "deviceLink";

const FEATURES: Feature[] = [
  {
    id: 0,
    subtitle: "PROFILE",
    title: "一键切换,8 种工作人格",
    lede: "8 套键映射 / 灯光 / 主题整组打包,旋钮一转即换,PC 状态联动。",
    points: [
      "8 套键映射 / 灯光 / 主题",
      "旋钮一转即换,PC 状态联动",
      "办公 / 游戏 / 剪辑 瞬间切换",
    ],
    screenText: "PROFILE 3 · OFFICE",
    copySide: "left",
    visual: "profileArc",
  },
  {
    id: 1,
    subtitle: "KEY MAPPING",
    title: "一个键,三种命运",
    lede: "每个键都同时承担功能键 / 普通键序列 / 宏三种角色,叠 FUN1 / FUN2 组合层。",
    points: [
      "功能键 / 普通键序列 / 宏",
      "FUN1 / FUN2 组合层",
      "每键独立配置,随 Profile 切换",
    ],
    screenText: "KEY 7 -> CTRL + C",
    copySide: "right",
    visual: "keyLayers",
  },
  {
    id: 2,
    subtitle: "RGB LIGHTING",
    title: "11 颗灯珠,9 种情绪",
    lede: "彩虹波 / 火焰 / 拾音律动;点击高亮,亮度可调,音乐屏自动避让。",
    points: [
      "彩虹波 / 火焰 / 拾音律动",
      "点击高亮,亮度可调",
      "音乐屏自动避让",
    ],
    screenText: "RAINBOW WAVE 80%",
    copySide: "left",
    visual: "rgbPalette",
  },
  {
    id: 3,
    subtitle: "VOICE ASR",
    title: "按住即说,松开出字",
    lede: "腾讯云 ASR 识别,HID 直出无需驱动;按住即录,松开自动上屏。",
    points: [
      "腾讯云 ASR 识别",
      "HID 直出,无需驱动",
      "音乐屏自动避让",
    ],
    screenText: "* REC LISTENING",
    copySide: "right",
    visual: "voiceWave",
  },
  {
    id: 4,
    subtitle: "APP LINK",
    title: "和桌面 App 说同一种语言",
    lede: "23 条协议 / PC 状态 / 音乐控制 / HA 聚合 / OTA 升级,TCP 30000 直连。",
    points: [
      "23 条协议 / PC 状态 / 音乐控制",
      "HA 聚合 / OTA 升级",
      "TCP 30000 端口直连",
    ],
    screenText: "TCP 30000 LINK OK",
    copySide: "left",
    visual: "deviceLink",
  },
];

const AUTO_INTERVAL = 6000;

export default function PrototypePage() {
  const [current, setCurrent] = useState<FeatureId>(0);
  const [animKey, setAnimKey] = useState(0);
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const { theme, toggleTheme, t } = useI18n();
  const [themeTip, setThemeTip] = useState<string>("");
  useEffect(() => {
    setThemeTip(t("a11y.toggleTheme"));
  }, [t]);

  const autoTimerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());
  const reducedMotion = useRef(false);

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

  // 时钟 — 顶部状态条
  const [time, setTime] = useState(() => formatTime(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setTime(formatTime(new Date())), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const goTo = (next: FeatureId) => {
    if (next === current) return;
    setCurrent(next);
    setAnimKey((k) => k + 1);
    setProgress(0);
    lastTickRef.current = performance.now();
    restartAuto();
  };
  const goNext = () =>
    goTo(FEATURE_IDS[(FEATURE_IDS.indexOf(current) + 1) % FEATURE_IDS.length]);
  const goPrev = () =>
    goTo(
      FEATURE_IDS[
        (FEATURE_IDS.indexOf(current) - 1 + FEATURE_IDS.length) %
          FEATURE_IDS.length
      ],
    );

  const restartAuto = () => {
    if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
    if (paused || reducedMotion.current) return;
    autoTimerRef.current = window.setInterval(goNext, AUTO_INTERVAL);
  };

  // 进度条 + 自动播放
  useEffect(() => {
    lastTickRef.current = performance.now();
    setProgress(0);
    if (paused || reducedMotion.current) return undefined;
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      setProgress((p) => {
        const next = p + (dt / AUTO_INTERVAL) * 100;
        return next > 100 ? 100 : next;
      });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    restartAuto();
    return () => {
      window.cancelAnimationFrame(raf);
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused]);

  const resetAuto = () => {
    lastTickRef.current = performance.now();
    setProgress(0);
    restartAuto();
  };

  // 键盘全局快捷键
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

  const feature = FEATURES[current];

  const listItems = useMemo(
    () =>
      FEATURE_IDS.map((id) => ({
        id,
        title: FEATURES[id].title,
        subtitle: FEATURES[id].subtitle,
      })),
    [],
  );

  return (
    <section className="proto">
      {/* 全屏背景 — 3D 键盘模型 */}
      <KeyboardPrototype3D
        activeFeature={current}
        onActiveFeatureChange={setCurrent}
      />

      {/* 顶部状态条 */}
      <header className="proto__topbar">
        <div className="proto__topbar-inner">
          <div className="proto__status-left">
            <span className="proto__status-dot" />
            <span>EKeys · 11 键宏键盘</span>
          </div>
          <div className="proto__status-right">
            <span>PROFILE 3</span>
            <span>BAT 98%</span>
            <span>{time}</span>
          </div>
        </div>
      </header>

      {/* 悬浮工具条 — 翻页 / 暂停 / 操作提示
       * 不再独占一行,改为绝对定位浮在 3D 模型上方。
       * 左 PREV / PAUSE / NEXT 按钮,右键盘快捷键提示(`.proto__hint`)。 */}
      <div className="proto__toolbar">
        <div className="proto__controls">
          <button
            type="button"
            className="proto__btn"
            onClick={() => {
              resetAuto();
              goPrev();
            }}
          >
            {"< "}PREV
          </button>
          <button
            type="button"
            className="proto__btn"
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? "PLAY" : "PAUSE"}
          </button>
          <button
            type="button"
            className="proto__btn"
            onClick={() => {
              resetAuto();
              goNext();
            }}
          >
            {"NEXT "}{">"}
          </button>
          <button
            type="button"
            className="proto__btn proto__btn--icon btn-icon"
            aria-label={t("a11y.toggleTheme")}
            title={themeTip}
            onClick={() => {
              toggleTheme();
              setThemeTip(t("a11y.toggleTheme"));
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <span className="proto__hint">
            ←/→ 切换 · 空格播放 · P 暂停
          </span>
        </div>
      </div>

      {/* 屏幕文字覆盖层(居中浮在 3D 模型上) */}
      <div className="proto__screen-overlay" aria-hidden="true">
        <ScreenTextLine text={feature.screenText} keyId={animKey} />
      </div>

      {/* 旋钮点击热区 — 浮在 3D 模型旋钮位置 */}
      <button
        type="button"
        className="proto__knob-hot"
        onClick={() => {
          resetAuto();
          goNext();
        }}
        aria-label="next feature"
        title="Next feature"
      >
        <span className="proto__knob-hot-label">NEXT</span>
      </button>

      {/* 文案 / 视觉区(中部留空给 3D 模型) */}
      <div className="proto__stage">
        <div className="proto__grid">
          {/* 左文案 */}
          <aside
            key={`copy-${animKey}`}
            className={`proto__col proto__col--copy proto__copy--${feature.copySide} proto__col--enter`}
          >
            <span className="proto__copy-subtitle">{feature.subtitle}</span>
            <h2 className="proto__copy-title">{feature.title}</h2>
            <p className="proto__copy-lede">{feature.lede}</p>
            <ul className="proto__copy-points">
              {feature.points.map((p, i) => (
                <li
                  key={p}
                  className="proto__copy-point"
                  style={{ animationDelay: `${i * 80 + 200}ms` }}
                >
                  <span className="proto__copy-point-icon">OK</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* 中部留空 — 3D 模型在 fixed 背景层 */}
          <div className="proto__col proto__col--spacer" aria-hidden="true" />

          {/* 右视觉区 */}
          <aside
            key={`visual-${animKey}`}
            className="proto__col proto__col--visual proto__col--enter"
          >
            <VisualPanel kind={feature.visual} />
          </aside>
        </div>
      </div>

      {/* 底部 */}
      <footer className="proto__bottombar">
        <div className="proto__bottombar-inner">
          <ol className="proto__knob-row" aria-label="features">
            {listItems.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={
                    "proto__knob-dot" + (f.id === current ? " is-active" : "")
                  }
                  onClick={() => {
                    resetAuto();
                    goTo(f.id);
                  }}
                  aria-current={f.id === current ? "true" : undefined}
                >
                  <span className="proto__knob-dot-num">0{f.id + 1}</span>
                  <span className="proto__knob-dot-name">{f.subtitle}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="proto__progress" aria-hidden="true">
            <span
              className="proto__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </footer>
    </section>
  );
}

/* ============================================================
   ScreenTextLine — 屏幕文字覆盖层的打字机效果
   ============================================================ */
function ScreenTextLine({ text, keyId }: { text: string; keyId: number }) {
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
  }, [text, keyId]);
  return (
    <span className="proto__screen-overlay-text">{typed || "\u00A0"}</span>
  );
}

/* ============================================================
   VisualPanel — 5 个功能对应的视觉元素
   ============================================================ */
function VisualPanel({ kind }: { kind: VisualKind }) {
  switch (kind) {
    case "profileArc":
      return (
        <div className="proto-visual proto-visual--profile">
          <span className="proto-visual__label">8 PROFILES</span>
          <div className="proto-visual__arc">
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 1.5 - Math.PI * 0.75;
              const x = 90 + Math.cos(angle) * 70;
              const y = 70 + Math.sin(angle) * 55;
              return (
                <span
                  key={i}
                  className={
                    "proto-visual__dot" +
                    (i === 2 ? " proto-visual__dot--active" : "")
                  }
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <span className="proto-visual__hint">keymap · RGB · theme</span>
        </div>
      );
    case "keyLayers":
      return (
        <div className="proto-visual proto-visual--layers">
          <span className="proto-visual__label">3 LAYERS</span>
          <div className="proto-visual__stack">
            <span className="proto-visual__chip proto-visual__chip--a">
              功能键层 · FUN1
            </span>
            <span className="proto-visual__chip proto-visual__chip--b">
              普通键序列 · 宏
            </span>
            <span className="proto-visual__chip proto-visual__chip--c">
              文本 · 多媒体
            </span>
          </div>
          <span className="proto-visual__hint">key · combo · macro</span>
        </div>
      );
    case "rgbPalette":
      return (
        <div className="proto-visual proto-visual--rgb">
          <span className="proto-visual__label">11 LEDs · 9 MODES</span>
          <div className="proto-visual__palette">
            {[
              "#ff4a4a",
              "#ffaa4a",
              "#ffff4a",
              "#4aff4a",
              "#4affaa",
              "#4a8aff",
              "#8a4aff",
              "#ff4aff",
              "#ff4a8a",
            ].map((c) => (
              <span
                key={c}
                className="proto-visual__swatch"
                style={{ background: c, color: c }}
              />
            ))}
          </div>
          <span className="proto-visual__hint">click highlight · ripple</span>
        </div>
      );
    case "voiceWave":
      return (
        <div className="proto-visual proto-visual--voice">
          <span className="proto-visual__label">PUSH-TO-TALK</span>
          <div className="proto-visual__rec">
            <span className="proto-visual__rec-dot" />
            REC · LISTENING
          </div>
          <div className="proto-visual__bars">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="proto-visual__bar"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="proto-visual__quote">"明天上午九点开会"</div>
        </div>
      );
    case "deviceLink":
      return (
        <div className="proto-visual proto-visual--device">
          <span className="proto-visual__label">23 COMMANDS</span>
          <div className="proto-visual__devices">
            <span className="proto-visual__device">PC</span>
            <span className="proto-visual__device proto-visual__device--mid">
              PHONE
            </span>
            <span className="proto-visual__device">HA</span>
          </div>
          <span className="proto-visual__hint">TCP 30000 · USB CDC · 2.4G</span>
        </div>
      );
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
