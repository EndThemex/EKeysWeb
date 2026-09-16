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
export default function Model3DPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero hero--model3d">
        <div className="container">
          <div className="model3d-hero" data-reveal>
            <div className="model3d-hero__copy">
              <span className="eyebrow">3D · LIVE PREVIEW</span>
              <h1
                className="hero__title"
                style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
              >
                EKeys
                <br />
                <span style={{ color: "var(--accent)" }}>3D Model</span>
              </h1>
              <p className="hero__lede hero__lede--wide">
                基于 Three.js 构建的实时 3D 模型。键盘整体
                <strong> 80 × 93 × 18 cm</strong>
                ，正面顶部为 428 : 124 比例的 LCD 屏幕，下方为 3 × 4
                按键矩阵，右上角为旋钮。
              </p>
              <div className="hero__cta-row">
                <Link to="/" className="btn">
                  ← BACK HOME
                </Link>
                <a href="#specs" className="btn btn--primary">
                  VIEW SPECS
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
              <span className="eyebrow">DIMENSIONS</span>
              <h2>Build Sheet</h2>
            </div>
            <p>
              键盘外壳厚度 18 cm, 包含面板凹陷 / 屏幕边框 / 按键柱体 / 旋钮
              凸出, 整体重心居中, 落地稳定。
            </p>
          </div>

          <div className="model3d-specs">
            <article className="model3d-spec" data-reveal>
              <div className="model3d-spec__num">01</div>
              <h3 className="model3d-spec__title">Chassis</h3>
              <ul className="model3d-spec__list">
                <li>
                  <span>WIDTH</span>
                  <strong>80 cm</strong>
                </li>
                <li>
                  <span>HEIGHT</span>
                  <strong>93 cm</strong>
                </li>
                <li>
                  <span>DEPTH</span>
                  <strong>18 cm</strong>
                </li>
                <li>
                  <span>BEVEL</span>
                  <strong>0.6 cm</strong>
                </li>
              </ul>
            </article>
            <article className="model3d-spec" data-reveal>
              <div className="model3d-spec__num">02</div>
              <h3 className="model3d-spec__title">LCD Panel</h3>
              <ul className="model3d-spec__list">
                <li>
                  <span>RATIO</span>
                  <strong>428 : 124</strong>
                </li>
                <li>
                  <span>SIZE</span>
                  <strong>72 × 20.9 cm</strong>
                </li>
                <li>
                  <span>DEPTH</span>
                  <strong>0.4 cm</strong>
                </li>
                <li>
                  <span>EMISSIVE</span>
                  <strong>0.7–0.85</strong>
                </li>
              </ul>
            </article>
            <article className="model3d-spec" data-reveal>
              <div className="model3d-spec__num">03</div>
              <h3 className="model3d-spec__title">Key Matrix</h3>
              <ul className="model3d-spec__list">
                <li>
                  <span>GRID</span>
                  <strong>3 × 4</strong>
                </li>
                <li>
                  <span>KEY SIZE</span>
                  <strong>~15.95 × 23.27 cm</strong>
                </li>
                <li>
                  <span>GAP</span>
                  <strong>2.2 cm</strong>
                </li>
                <li>
                  <span>TRAVEL</span>
                  <strong>3.5 cm</strong>
                </li>
              </ul>
            </article>
            <article className="model3d-spec model3d-spec--accent" data-reveal>
              <div className="model3d-spec__num">04</div>
              <h3 className="model3d-spec__title">Encoder (R1·C4)</h3>
              <ul className="model3d-spec__list">
                <li>
                  <span>RADIUS</span>
                  <strong>~8.17 cm</strong>
                </li>
                <li>
                  <span>HEIGHT</span>
                  <strong>6 cm</strong>
                </li>
                <li>
                  <span>KNURL</span>
                  <strong>28 facets</strong>
                </li>
                <li>
                  <span>INDICATOR</span>
                  <strong>white LED line</strong>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
