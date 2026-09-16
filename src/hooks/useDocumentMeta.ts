import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * useDocumentMeta — 根据路由 + 当前语言更新 document.title 与 meta description，
 * 避免 SPA 始终使用 index.html 里写死的英文。
 */
export function useDocumentMeta(): void {
  const { pathname } = useLocation();
  const { t, lang } = useI18n();

  useEffect(() => {
    const titleKey =
      pathname.startsWith("/features")
        ? "site.title.features"
        : pathname.startsWith("/specs")
        ? "site.title.specs"
        : pathname.startsWith("/docs")
        ? "site.title.docs"
        : pathname.startsWith("/config")
        ? "site.title.config"
        : pathname.startsWith("/model3d")
        ? "site.title.model3d"
        : "site.title.home";

    document.title = t(titleKey);

    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("site.description"));

    // 给 <html lang> 留个最终保证，useI18n 里其实已经设置过了
    document.documentElement.setAttribute(
      "lang",
      lang === "zh" ? "zh-CN" : "en",
    );
  }, [pathname, t, lang]);
}
