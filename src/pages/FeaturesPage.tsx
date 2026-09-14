import { useI18n } from "../i18n/useI18n.tsx";
import Ticker from "../components/Ticker";
import { FEATURES, PROFILES } from "../data/content";

/**
 * FeaturesPage — 对应原 features.html。
 */
export default function FeaturesPage() {
  const { t, tag } = useI18n();

  return (
    <>
      <section className="hero">
        <div className="container" data-reveal>
          <span className="eyebrow">{t("section.features.eyebrow")}</span>
          <h1
            className="hero__title"
            style={{ fontSize: "clamp(56px, 9vw, 140px)" }}
          >
            {t("nav.features")}
          </h1>
          <p className="hero__lede hero__lede--wide">
            {t("section.features.subtitle")}
          </p>
        </div>
      </section>

      <Ticker />

      <section className="section">
        <div className="container">
          <div className="features">
            {FEATURES.map((f) => (
              <article key={f.num} className="feature" data-reveal>
                <div className="feature__num">{f.num}</div>
                <h3 className="feature__title">{t(f.titleKey)}</h3>
                <p className="feature__desc">{t(f.descKey)}</p>
                <div className="feature__tags">
                  {tag(f.tagsKey).map((tagText) => (
                    <span key={tagText} className="tag">
                      {tagText}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PIPELINE DIAGRAM */}
      <section className="section section--bordered">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("features.pipeline.eyebrow")}</span>
              <h2>{t("features.pipeline.title")}</h2>
            </div>
            <p>{t("features.pipeline.desc")}</p>
          </div>

          <div className="two-col">
            <div className="diagram" data-reveal>
              <span className="diagram__label">{t("features.pipeline.fig1")}</span>
              <pre className="diagram__pre">
                {t("features.pipeline.fig1.body")}
              </pre>
            </div>
            <div className="diagram" data-reveal>
              <span className="diagram__label">{t("features.pipeline.fig2")}</span>
              <pre className="diagram__pre">
                {t("features.pipeline.fig2.body")}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* PROFILES */}
      <section className="section section--bordered">
        <div className="container">
          <div className="section__head section__head--tight" data-reveal>
            <div>
              <span className="eyebrow">{t("section.profiles.eyebrow")}</span>
              <h2>{t("section.profiles.title")}</h2>
            </div>
            <p>{t("section.profiles.subtitle")}</p>
          </div>
          <div className="profiles">
            {PROFILES.map((p) => (
              <div key={p.index} className="profile" data-reveal>
                <div className="profile__icon">{p.icon}</div>
                <h3 className="profile__title">{t(p.titleKey)}</h3>
                <p className="profile__desc">{t(p.descKey)}</p>
                <div className="profile__meta">
                  <span>{t(p.keysKey)}</span>
                  <span>{p.index}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
