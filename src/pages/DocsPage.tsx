import { useI18n } from "../i18n/useI18n.tsx";
import Ticker from "../components/Ticker";
import CodeBlock from "../components/CodeBlock";

/**
 * DocsPage — 对应原 docs.html。
 * 在保留原有「What is EKeys / Set it up / For tinkerers / Companion app」骨架的基础上，
 * 加入了连接流程 / 键映射 / 音效板 / 固件升级四个流程说明章节。
 */
export default function DocsPage() {
  const { t, tag } = useI18n();

  return (
    <>
      <section className="hero">
        <div className="container" data-reveal>
          <span className="eyebrow">{t("docs.title")}</span>
          <h1
            className="hero__title"
            style={{ fontSize: "clamp(56px, 9vw, 140px)" }}
          >
            {t("docs.title")}
          </h1>
          <p className="hero__lede hero__lede--wide">{t("docs.lede")}</p>
        </div>
      </section>

      <Ticker />

      <section className="section">
        <div className="container">
          <div className="docs">
            <aside className="docs-nav" data-reveal>
              <span className="eyebrow">{t("docs.nav.eyebrow")}</span>
              <ul>
                <li><a href="#overview">{t("docs.nav.overview")}</a></li>
                <li><a href="#build">{t("docs.nav.build")}</a></li>
                <li><a href="#connect">{t("docs.nav.connect")}</a></li>
                <li><a href="#keymap">{t("docs.nav.keymap")}</a></li>
                <li><a href="#audio">{t("docs.nav.audio")}</a></li>
                <li><a href="#firmware">{t("docs.nav.firmware")}</a></li>
                <li><a href="#protocol">{t("docs.nav.protocol")}</a></li>
                <li><a href="#app">{t("docs.nav.app")}</a></li>
                <li><a href="#roadmap">{t("docs.nav.roadmap")}</a></li>
              </ul>
            </aside>

            <div className="docs-body" data-reveal>
              <h3 id="overview">{t("docs.h.overview")}</h3>
              <p>{t("docs.p.overview")}</p>

              <h3 id="build">{t("docs.h.build")}</h3>
              <p>{t("docs.p.build")}</p>
              <CodeBlock
                label="pio · platformio"
                code={t("docs.code.build")}
              />

              <h3 id="connect">{t("docs.h.connect")}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t("docs.p.connect") }}
              />
              <ol className="docs-steps">
                {tag("docs.steps.connect").map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <h3 id="keymap">{t("docs.h.keymap")}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t("docs.p.keymap") }}
              />
              <ol className="docs-steps">
                {tag("docs.steps.keymap").map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <h3 id="audio">{t("docs.h.audio")}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t("docs.p.audio") }}
              />
              <ol className="docs-steps">
                {tag("docs.steps.audio").map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <h3 id="firmware">{t("docs.h.firmware")}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t("docs.p.firmware") }}
              />
              <ol className="docs-steps">
                {tag("docs.steps.firmware").map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <h3 id="protocol">{t("docs.h.protocol")}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t("docs.p.protocol") }}
              />

              <h3 id="app">{t("docs.h.app")}</h3>
              <p>{t("docs.p.app")}</p>

              <h3>{t("docs.h.companion")}</h3>
              <p>{t("docs.p.companion.lede")}</p>
              <ul>
                <li
                  dangerouslySetInnerHTML={{
                    __html: t("docs.p.companion.firmware"),
                  }}
                />
                <li
                  dangerouslySetInnerHTML={{
                    __html: t("docs.p.companion.app"),
                  }}
                />
              </ul>
              <p>{t("docs.p.companion.tail")}</p>

              <h3 id="roadmap">{t("docs.h.roadmap")}</h3>
              <p>{t("docs.p.roadmap")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
