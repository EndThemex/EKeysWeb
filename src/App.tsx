import { useEffect } from "react";
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
 * App receives an `onMounted` callback fired after the first commit so the
 * boot skeleton can be hidden without flashing unstyled content.
 */
export default function App({ onMounted }: { onMounted?: () => void }) {
  useScrollOnRouteChange();
  useDocumentMeta();

  const mainRef = useReveal();
  const location = useLocation();

  useEffect(() => {
    if (!onMounted) return;
    const id = window.requestAnimationFrame(() => onMounted());
    return () => window.cancelAnimationFrame(id);
  }, [onMounted]);

  return (
    <>
      <SiteHeader />
      <main key={location.pathname} ref={mainRef}>
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
