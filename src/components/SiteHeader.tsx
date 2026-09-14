import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * SiteHeader — 顶部导航
 * 使用 react-router 的 NavLink 实现 active 状态。
 * 在窄屏 (<=960px) 下,导航折叠为抽屉式菜单,通过 burger 按钮展开。
 */
export default function SiteHeader() {
  const { t, lang, toggleLang, theme, toggleTheme } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // 切换路由后自动关闭移动端导航
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <header className={"site-header" + (navOpen ? " is-nav-open" : "")}>
      <div className="container site-header__inner">
        <NavLink to="/" className="brand" aria-label="EKeys home" end>
          <span className="brand__mark">E</span>
          <span>
            <span className="brand__name">EKEYS</span>
            <span className="brand__sub">{t("brand.tagline")}</span>
          </span>
        </NavLink>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "is-active" : "")}>
            {t("nav.home")}
          </NavLink>
          <NavLink to="/features" className={({ isActive }) => (isActive ? "is-active" : "")}>
            {t("nav.features")}
          </NavLink>
          <NavLink to="/specs" className={({ isActive }) => (isActive ? "is-active" : "")}>
            {t("nav.specs")}
          </NavLink>
          <NavLink to="/app" className={({ isActive }) => (isActive ? "is-active" : "")}>
            {t("nav.app")}
          </NavLink>
          <NavLink to="/docs" className={({ isActive }) => (isActive ? "is-active" : "")}>
            {t("nav.docs")}
          </NavLink>
        </nav>

        <div className="toolbar">
          <button
            id="langToggle"
            className="btn-icon"
            aria-label={t("a11y.toggleLang")}
            onClick={toggleLang}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
          <button
            id="themeToggle"
            className="btn-icon"
            aria-label={t("a11y.toggleTheme")}
            onClick={toggleTheme}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <NavLink to="/docs" className="btn btn--ghost site-header__cta">
            {t("nav.github")}
          </NavLink>
          <button
            type="button"
            className="nav-toggle"
            aria-label={navOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? "✕" : "≡"}
          </button>
        </div>
      </div>
    </header>
  );
}
