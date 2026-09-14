import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";
import Ticker from "../components/Ticker";
import HeroDevice from "../components/HeroDevice";
import { FEATURES, PROFILES } from "../data/content";

/**
 * HomePage — 对应原 index.html 的内容。
 */
export default function HomePage() {
  const { t, tag } = useI18n();

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero__grid">
          <div data-reveal>
            <span className="eyebrow">{t("hero.eyebrow")}</span>
            <h1 className="hero__title">
              <span>{t("hero.title.1")}</span>
              <br />
              <span>{t("hero.title.2")}</span>
            </h1>
            <p className="hero__lede">{t("hero.lede")}</p>
            <div className="hero__cta-row">
              <Link to="/features" className="btn btn--primary">
                {t("hero.cta.primary")}
              </Link>
              <Link to="/specs" className="btn">
                {t("hero.cta.secondary")}
              </Link>
            </div>
            <dl className="hero__meta">
              <div>
                <dt>{t("hero.meta.chip")}</dt>
                <dd>{t("hero.meta.chip.v")}</dd>
              </div>
              <div>
                <dt>{t("hero.meta.keys")}</dt>
                <dd>{t("hero.meta.keys.v")}</dd>
              </div>
              <div>
                <dt>{t("hero.meta.feel")}</dt>
                <dd>{t("hero.meta.feel.v")}</dd>
              </div>
              <div>
                <dt>{t("hero.meta.link")}</dt>
                <dd>{t("hero.meta.link.v")}</dd>
              </div>
            </dl>
          </div>

          <HeroDevice />
        </div>
      </section>

      <Ticker />

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("section.features.eyebrow")}</span>
              <h2>{t("section.features.title")}</h2>
            </div>
            <p>{t("section.features.subtitle")}</p>
          </div>

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

      {/* MARQUEE */}
      <div className="marquee-block" data-reveal>
        <p className="marquee-block__title">{t("section.profiles.eyebrow")}</p>
        <div className="marquee-block__row" aria-hidden="true">
          <span>{t("marquee.text")}</span>
          <span>{t("marquee.text")}</span>
        </div>
      </div>

      {/* PROFILES */}
      <section className="section section--tight">
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

      {/* CTA */}
      <section className="section section--tight section--bordered">
        <div className="container cta">
          <div className="cta__copy" data-reveal>
            <span className="eyebrow">{t("cta.bottom.eyebrow")}</span>
            <h2 className="cta__title">{t("cta.bottom.title")}</h2>
            <p className="cta__subtitle">{t("cta.bottom.subtitle")}</p>
          </div>
          <Link to="/docs" className="btn btn--primary cta__btn" data-reveal>
            {t("cta.bottom.button")}
          </Link>
        </div>
      </section>
    </>
  );
}
