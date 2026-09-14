import { useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";
import Ticker from "../components/Ticker";
import { SPEC_TABS } from "../data/content";

/**
 * SpecsPage — 参数 / 规格 页面。
 * 内容按 `data/content.ts` 的 SPEC_TABS 配置，
 * 每行通过 i18n key 渲染，所以中文界面下不会出现硬编码英文。
 */
export default function SpecsPage() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<string>(SPEC_TABS[0].id);
  const tab = SPEC_TABS.find((item) => item.id === activeTab) ?? SPEC_TABS[0];

  // SVG 中的文字标签也按语言切换，避免在中文下出现 KNOB / USB-C / VENT HOLES 等英文。
  const knobLabel = t("specs.size.label.knob");
  const usbLabel = t("specs.size.label.usbc");
  const ventLabel = t("specs.size.label.vent");
  // 中文字符更宽，相应放大字号以保证可读性
  const labelFontSize = lang === "zh" ? 12 : 10;
  const ventFontSize = lang === "zh" ? 13 : 11;

  return (
    <>
      <section className="hero">
        <div className="container" data-reveal>
          <span className="eyebrow">{t("specs.eyebrow")}</span>
          <h1
            className="hero__title"
            style={{ fontSize: "clamp(56px, 9vw, 140px)" }}
          >
            {t("nav.specs")}
          </h1>
          <p className="hero__lede hero__lede--wide">
            {t("specs.subtitle")}
          </p>
        </div>
      </section>

      <Ticker />

      {/* SPECS TABS */}
      <section className="section">
        <div className="container">
          <div className="specs-wrap" data-reveal>
            <div
              className="specs-tabs"
              role="tablist"
              aria-label="Specification categories"
            >
              {SPEC_TABS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={item.id === activeTab}
                  className={item.id === activeTab ? "is-active" : ""}
                  onClick={() => setActiveTab(item.id)}
                >
                  {t(item.tabKey)}
                </button>
              ))}
            </div>

            <table className="specs-table">
              <tbody>
                {tab.rows.map((row) => (
                  <tr key={row.th}>
                    <th scope="row">{t(row.th)}</th>
                    <td>{t(row.td)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* DIMENSIONS */}
      <section className="section section--bordered">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("specs.size.eyebrow")}</span>
              <h2>{t("specs.size.title")}</h2>
            </div>
            <p>{t("specs.size.desc")}</p>
          </div>

          <div className="two-col">
            <div className="diagram diagram--centered" data-reveal>
              <span className="diagram__label">{t("specs.size.fig.top")}</span>
              <svg
                viewBox="0 0 400 240"
                className="diagram__svg"
                aria-label={t("specs.size.fig.top")}
              >
                <rect
                  x="20"
                  y="20"
                  width="360"
                  height="200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <g fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="40" y="50" width="60" height="50" />
                  <rect x="110" y="50" width="60" height="50" />
                  <rect x="180" y="50" width="60" height="50" />
                  <rect x="250" y="50" width="60" height="50" />
                  <rect x="40" y="110" width="60" height="50" />
                  <rect x="110" y="110" width="60" height="50" />
                  <rect x="180" y="110" width="60" height="50" />
                  <rect x="250" y="110" width="60" height="50" />
                </g>
                <circle cx="320" cy="195" r="14" fill="var(--accent)" />
                <text
                  x="320"
                  y="199"
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fontFamily="monospace"
                  fill="white"
                  fontWeight="700"
                >
                  {knobLabel}
                </text>
              </svg>
            </div>
            <div className="diagram diagram--centered" data-reveal>
              <span className="diagram__label">{t("specs.size.fig.back")}</span>
              <svg
                viewBox="0 0 400 240"
                className="diagram__svg"
                aria-label={t("specs.size.fig.back")}
              >
                <rect
                  x="20"
                  y="20"
                  width="360"
                  height="200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="320"
                  y="100"
                  width="40"
                  height="20"
                  fill="currentColor"
                />
                <text
                  x="340"
                  y="135"
                  textAnchor="middle"
                  fontSize={labelFontSize - 1}
                  fontFamily="monospace"
                  fill="currentColor"
                >
                  {usbLabel}
                </text>
                <g
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                >
                  <line x1="40" y1="40" x2="120" y2="40" />
                  <line x1="40" y1="55" x2="200" y2="55" />
                  <line x1="40" y1="70" x2="160" y2="70" />
                  <line x1="40" y1="85" x2="240" y2="85" />
                  <line x1="40" y1="100" x2="180" y2="100" />
                  <line x1="40" y1="115" x2="220" y2="115" />
                </g>
                <text
                  x="125"
                  y="200"
                  fontSize={ventFontSize}
                  fontFamily="monospace"
                  fill="currentColor"
                >
                  {ventLabel}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
