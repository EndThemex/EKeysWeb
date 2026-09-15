import { useEffect, useLayoutEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import ScrollCue from "./components/ScrollCue";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import SpecsPage from "./pages/SpecsPage";
import DocsPage from "./pages/DocsPage";
import AppPage from "./pages/AppPage";
import { ConfigLayout } from "./components/ConfigLayout";
import { SettingsPanel } from "./components/SettingsPanel";
import { KeymapPanel } from "./components/KeymapPanel";
import { LightingPanel } from "./components/LightingPanel";
import { VoicePanel } from "./components/VoicePanel";
import { AboutPanel } from "./components/AboutPanel";
import { LogPanel } from "./components/LogPanel";
import { useReveal } from "./hooks/useReveal";
import { useDocumentMeta } from "./hooks/useDocumentMeta";

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

  return (
    <>
      <SiteHeader />
      <main className="app-root" ref={mainRef}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/specs" element={<SpecsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/app" element={<AppPage />} />

          {/* Config 区：二级 Tab */}
          <Route path="/config" element={<ConfigLayout />}>
            <Route index element={<SettingsPanel />} />
            <Route path="keymap" element={<KeymapPanel />} />
            <Route path="lighting" element={<LightingPanel />} />
            <Route path="voice" element={<VoicePanel />} />
            <Route path="log" element={<LogPanel />} />
            <Route path="about" element={<AboutPanel />} />
          </Route>

          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <SiteFooter />
      <ScrollCue />
    </>
  );
}
