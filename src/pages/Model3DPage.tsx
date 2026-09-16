import { Link } from "react-router-dom";
import Keyboard3D from "../components/Keyboard3D";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * Model3DPage — 使用 Three.js 渲染的键盘 3D 模型展示页面。
 *
 * 规格：
 *   - 整体：80 cm(W) × 93 cm(H) × 18 cm(D)
 *   - 正面：上部 428:124 LCD 屏，下部 3 行 × 4 列按键矩阵
 *   - 第一行第四列(右上)为旋钮(Encoder)
 */
type SpecCard = {
  num: string;
  titleKey: string;
  rows: { labelKey: string; valueKey: string }[];
};

const SPEC_CARDS: SpecCard[] = [
  {
    num: "01",
    titleKey: "model3d.specs.01.title",
    rows: [
      { labelKey: "model3d.specs.01.label.0", valueKey: "model3d.specs.01.value.0" },
      { labelKey: "model3d.specs.01.label.1", valueKey: "model3d.specs.01.value.1" },
      { labelKey: "model3d.specs.01.label.2", valueKey: "model3d.specs.01.value.2" },
      { labelKey: "model3d.specs.01.label.3", valueKey: "model3d.specs.01.value.3" },
    ],
  },
  {
    num: "02",
    titleKey: "model3d.specs.02.title",
    rows: [
      { labelKey: "model3d.specs.02.label.0", valueKey: "model3d.specs.02.value.0" },
      { labelKey: "model3d.specs.02.label.1", valueKey: "model3d.specs.02.value.1" },
      { labelKey: "model3d.specs.02.label.2", valueKey: "model3d.specs.02.value.2" },
      { labelKey: "model3d.specs.02.label.3", valueKey: "model3d.specs.02.value.3" },
    ],
  },
  {
    num: "03",
    titleKey: "model3d.specs.03.title",
    rows: [
      { labelKey: "model3d.specs.03.label.0", valueKey: "model3d.specs.03.value.0" },
      { labelKey: "model3d.specs.03.label.1", valueKey: "model3d.specs.03.value.1" },
      { labelKey: "model3d.specs.03.label.2", valueKey: "model3d.specs.03.value.2" },
      { labelKey: "model3d.specs.03.label.3", valueKey: "model3d.specs.03.value.3" },
    ],
  },
  {
    num: "04",
    titleKey: "model3d.specs.04.title",
    rows: [
      { labelKey: "model3d.specs.04.label.0", valueKey: "model3d.specs.04.value.0" },
      { labelKey: "model3d.specs.04.label.1", valueKey: "model3d.specs.04.value.1" },
      { labelKey: "model3d.specs.04.label.2", valueKey: "model3d.specs.04.value.2" },
      { labelKey: "model3d.specs.04.label.3", valueKey: "model3d.specs.04.value.3" },
    ],
  },
];

export default function Model3DPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero hero--model3d">
        <div className="container">
          <div className="model3d-hero" data-reveal>
            <div className="model3d-hero__copy">
              <span className="eyebrow">{t("model3d.hero.eyebrow")}</span>
              <h1
                className="hero__title"
                style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
              >
                {t("model3d.hero.title.1")}
                <br />
                <span style={{ color: "var(--accent)" }}>
                  {t("model3d.hero.title.2")}
                </span>
              </h1>
              <p
                className="hero__lede hero__lede--wide"
                dangerouslySetInnerHTML={{ __html: t("model3d.hero.lede") }}
              />
              <div className="hero__cta-row">
                <Link to="/" className="btn">
                  {t("model3d.hero.cta.secondary")}
                </Link>
                <a href="#specs" className="btn btn--primary">
                  {t("model3d.hero.cta.primary")}
                </a>
              </div>
            </div>
            <div className="model3d-hero__stage">
              <Keyboard3D />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--bordered" id="specs">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("model3d.specs.eyebrow")}</span>
              <h2>{t("model3d.specs.title")}</h2>
            </div>
            <p>{t("model3d.specs.lede")}</p>
          </div>

          <div className="model3d-specs">
            {SPEC_CARDS.map((card, idx) => (
              <article
                key={card.num}
                className={
                  "model3d-spec" +
                  (idx === SPEC_CARDS.length - 1 ? " model3d-spec--accent" : "")
                }
                data-reveal
              >
                <div className="model3d-spec__num">{card.num}</div>
                <h3 className="model3d-spec__title">{t(card.titleKey)}</h3>
                <ul className="model3d-spec__list">
                  {card.rows.map((row) => (
                    <li key={row.labelKey}>
                      <span>{t(row.labelKey)}</span>
                      <strong>{t(row.valueKey)}</strong>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}