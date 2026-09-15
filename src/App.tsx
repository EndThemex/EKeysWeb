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
import ConfigPage from "./pages/ConfigPage";
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

  // Callback ref re-runs the reveal observer whenever <main> is remounted
  // (i.e. on every route change).
  const mainRef = useReveal();
  const location = useLocation();

  useEffect(() => {
    if (!onMounted) return;
    // requestAnimationFrame: wait for first paint so the skeleton doesn't
    // disappear before any real pixels are on screen.
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
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <SiteFooter />
      <ScrollCue />
    </>
  );
}
