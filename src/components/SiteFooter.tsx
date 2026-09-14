import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * SiteFooter — 与所有页面共用的底部。
 */
export default function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <div className="brand" style={{ marginBottom: 16 }}>
              <span className="brand__mark">E</span>
              <span className="brand__name">EKEYS</span>
            </div>
            <p>{t("footer.tagline")}</p>
          </div>

          <div>
            <h4>{t("footer.product")}</h4>
            <ul>
              <li><Link to="/">{t("nav.home")}</Link></li>
              <li><Link to="/features">{t("nav.features")}</Link></li>
              <li><Link to="/specs">{t("nav.specs")}</Link></li>
              <li><Link to="/app">{t("nav.app")}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t("footer.resources")}</h4>
            <ul>
              <li><Link to="/docs">{t("nav.docs")}</Link></li>
              <li><Link to="/docs#protocol">{t("docs.nav.protocol")}</Link></li>
              <li><Link to="/docs#build">{t("docs.nav.build")}</Link></li>
              <li><Link to="/docs#keymap">{t("docs.nav.keymap")}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t("footer.community")}</h4>
            <ul>
              <li><Link to="/docs">{t("nav.github")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>{t("footer.copy")}</span>
          <span>{t("footer.build")}</span>
        </div>
      </div>
    </footer>
  );
}