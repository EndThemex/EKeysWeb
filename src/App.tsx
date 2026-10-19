import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import ScrollCue from "./components/ScrollCue";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import SpecsPage from "./pages/SpecsPage";
import DocsPage from "./pages/DocsPage";
import AppPage from "./pages/AppPage";
import { useReveal } from "./hooks/useReveal";
import { useDocumentMeta } from "./hooks/useDocumentMeta";

/* ============================================================
   路由级懒加载
   - 3D 三页（/model3d /showcase /prototype）是 three.js 的唯一入口，
     改成动态 import 后 three 不再进入首屏包；
   - /config 及其 8 个 Tab 面板（含 Web Serial / 协议层）同样按需加载，
     用户不打开配置页就不会下载；
   - 其余营销页体积小且是常见入口，保持静态导入，避免碎 chunk。
   ============================================================ */
const Model3DPage = lazy(() => import("./pages/Model3DPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const PrototypePage = lazy(() => import("./pages/PrototypePage"));

const ConfigLayout = lazy(() =>
  import("./components/ConfigLayout").then((m) => ({ default: m.ConfigLayout })),
);
const SettingsPanel = lazy(() =>
  import("./components/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
const KeymapPanel = lazy(() =>
  import("./components/KeymapPanel").then((m) => ({ default: m.KeymapPanel })),
);
const LightingPanel = lazy(() =>
  import("./components/LightingPanel").then((m) => ({ default: m.LightingPanel })),
);
const VoicePanel = lazy(() =>
  import("./components/VoicePanel").then((m) => ({ default: m.VoicePanel })),
);
const AudioPadPanel = lazy(() =>
  import("./components/AudioPadPanel").then((m) => ({ default: m.AudioPadPanel })),
);
const OtaPanel = lazy(() =>
  import("./components/OtaPanel").then((m) => ({ default: m.OtaPanel })),
);
const LogPanel = lazy(() =>
  import("./components/LogPanel").then((m) => ({ default: m.LogPanel })),
);
const AboutPanel = lazy(() =>
  import("./components/AboutPanel").then((m) => ({ default: m.AboutPanel })),
);

/**
 * 懒加载占位：撑住页面高度，避免 chunk 到达前 footer 上跳 / 布局抖动。
 * 不画 spinner —— 这些 chunk 都在几十毫秒内到达，闪一下反而更吵。
 */
function PageFallback() {
  return (
    <div
      className="page"
      style={{ minHeight: "70vh" }}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

/** 全屏独立页（/showcase /prototype）的占位，保持整屏底色不闪白 */
function ScreenFallback() {
  return (
    <div
      className="app-root"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

/** /showcase /prototype 是完全脱离外壳的独立全屏页 */
const STANDALONE_ROUTES = new Set<string>(["/showcase", "/prototype"]);
function isStandalone(pathname: string): boolean {
  return STANDALONE_ROUTES.has(pathname.split("/").slice(0, 2).join("/") || "/");
}

/** 切换路由时回到顶部，同时更新文档标题 */
function useScrollOnRouteChange() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);
}

/**
 * 仅在一级路由切换时挂上 .page--enter 触发 pageEnter 动画，
 * 二级 Tab 切换（同前缀 path）不触发，避免重 mount <main>、丢失
 * Web Serial 连接 / 心跳 / 草稿。
 */
function usePageEnterOnTopRouteChange() {
  const location = useLocation();
  const prevBase = useRef<string | null>(null);
  useLayoutEffect(() => {
    const base = location.pathname.split("/").slice(0, 2).join("/") || "/";
    const root = document.querySelector("main.app-root") as HTMLElement | null;
    if (!root) return;
    if (prevBase.current !== null && prevBase.current !== base) {
      // 强制重新触发动画
      root.classList.remove("page--enter");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void root.offsetWidth;
      root.classList.add("page--enter");
    } else if (prevBase.current === null) {
      root.classList.add("page--enter");
    }
    prevBase.current = base;
  }, [location.pathname]);
}

/**
 * App receives an `onMounted` callback fired after the first commit so the
 * boot skeleton can be hidden without flashing unstyled content.
 */
export default function App({ onMounted }: { onMounted?: () => void }) {
  useScrollOnRouteChange();
  usePageEnterOnTopRouteChange();
  useDocumentMeta();

  const location = useLocation();
  const standalone = isStandalone(location.pathname);
  // 仅在一级路由变化时重建 reveal observer；二级 Tab 切换不动它，
  // 但因为 config 面板不用 [data-reveal]，MutationObserver 在 Tab 切
  // 换时不会观察到任何新目标，等价于 no-op。
  const topRouteBase =
    location.pathname.split("/").slice(0, 2).join("/") || "/";
  const mainRef = useReveal(topRouteBase);

  useEffect(() => {
    if (!onMounted) return;
    const id = window.requestAnimationFrame(() => onMounted());
    return () => window.cancelAnimationFrame(id);
  }, [onMounted]);

  // 独立页(如 /showcase):完全脱离 SiteHeader / Footer / ScrollCue / app-root 外壳,
  // 自行负责全屏布局。其余路由走标准站点外壳。
  if (standalone) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/showcase" element={<ShowcasePage />} />
          <Route path="/prototype" element={<PrototypePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="app-root" ref={mainRef}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/specs" element={<SpecsPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/model3d" element={<Model3DPage />} />
            <Route path="/showcase" element={<ShowcasePage />} />
            <Route path="/prototype" element={<PrototypePage />} />

            {/* Config 区：二级 Tab */}
            <Route path="/config" element={<ConfigLayout />}>
              <Route index element={<SettingsPanel />} />
              <Route path="keymap" element={<KeymapPanel />} />
              <Route path="lighting" element={<LightingPanel />} />
              <Route path="voice" element={<VoicePanel />} />
              <Route path="audio" element={<AudioPadPanel />} />
              <Route path="ota" element={<OtaPanel />} />
              <Route path="log" element={<LogPanel />} />
              <Route path="about" element={<AboutPanel />} />
            </Route>

            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
      <ScrollCue />
    </>
  );
}
