import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";
import Ticker from "../components/Ticker";
import { APP_PANELS, APP_PRINCIPLES, APP_SHORTCUTS } from "../data/content";

/**
 * AppPage — 配套桌面 App 介绍页。
 *
 * 设计上与 HomePage 同一套视觉骨架：
 * - 顶部 hero + 设备预览占位
 * - 01 设计原则
 * - 02 九大面板逐一介绍
 * - 03 快捷键速查表
 * - 底部 CTA 引向代码仓库
 *
 * 文案全部走 i18n key，避免硬编码英文。
 */
export default function AppPage() {
  const { t, tag } = useI18n();

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero__grid" data-reveal>
          <div>
            <span className="eyebrow">{t("app.hero.eyebrow")}</span>
            <h1 className="hero__title">
              <span>{t("app.hero.title.1")}</span>
              <br />
              <span>{t("app.hero.title.2")}</span>
            </h1>
            <p className="hero__lede">{t("app.hero.lede")}</p>
            <div className="hero__cta-row">
              <a href="#panels" className="btn btn--primary">
                {t("app.hero.cta.primary")}
              </a>
              <Link to="/docs" className="btn">
                {t("app.hero.cta.secondary")}
              </Link>
            </div>
            <dl className="hero__meta">
              <div>
                <dt>{t("app.hero.meta.lang")}</dt>
                <dd>{t("app.hero.meta.lang.v")}</dd>
              </div>
              <div>
                <dt>{t("app.hero.meta.platform")}</dt>
                <dd>{t("app.hero.meta.platform.v")}</dd>
              </div>
              <div>
                <dt>{t("app.hero.meta.link")}</dt>
                <dd>{t("app.hero.meta.link.v")}</dd>
              </div>
            </dl>
          </div>

          <div className="hero__device hero__device--app" aria-hidden="true">
            <span className="hero__device-tag">{t("app.hero.device.tag")}</span>
            <div className="appwindow">
              <div className="appwindow__titlebar">
                <span className="appwindow__dot" />
                <span className="appwindow__dot" />
                <span className="appwindow__dot" />
                <span className="appwindow__title">EKeysApp</span>
              </div>
              <div className="appwindow__body">
                <div className="appwindow__sidebar">
                  <div className="appwindow__nav is-active">● 设备设置</div>
                  <div className="appwindow__nav">键盘</div>
                  <div className="appwindow__nav">灯效</div>
                  <div className="appwindow__nav">Wi-Fi</div>
                  <div className="appwindow__nav">音效</div>
                  <div className="appwindow__nav">语音</div>
                  <div className="appwindow__nav">日志</div>
                </div>
                <div className="appwindow__content">
                  <div className="appwindow__tabs">
                    <span className="is-active">显示</span>
                    <span>键盘</span>
                    <span>音频</span>
                    <span>电源</span>
                  </div>
                  <div className="appwindow__row">
                    <span className="appwindow__label">屏幕主题</span>
                    <span className="appwindow__value">深色 ▾</span>
                  </div>
                  <div className="appwindow__row">
                    <span className="appwindow__label">屏幕背光</span>
                    <span className="appwindow__bar">
                      <span className="appwindow__bar-fill" />
                    </span>
                  </div>
                  <div className="appwindow__diff">3 项待同步 →</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      {/* 01 — 设计原则 */}
      <section className="section">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("app.section.principles.eyebrow")}</span>
              <h2>{t("app.section.principles.title")}</h2>
            </div>
            <p>{t("app.section.principles.subtitle")}</p>
          </div>

          <div className="principles">
            {APP_PRINCIPLES.map((p) => (
              <article key={p.num} className="principle" data-reveal>
                <div className="principle__num">{p.num}</div>
                <h3 className="principle__title">{t(p.titleKey)}</h3>
                <p className="principle__desc">{t(p.descKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 02 — 九大面板 */}
      <section id="panels" className="section section--bordered">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("app.section.panels.eyebrow")}</span>
              <h2>{t("app.section.panels.title")}</h2>
            </div>
            <p>{t("app.section.panels.subtitle")}</p>
          </div>

          <div className="app-panels">
            {APP_PANELS.map((panel) => (
              <article key={panel.num} className="app-panel" data-reveal>
                <div className="app-panel__head">
                  <span className="app-panel__num">{panel.num}</span>
                  <h3 className="app-panel__title">{t(panel.titleKey)}</h3>
                </div>
                <p className="app-panel__desc">{t(panel.descKey)}</p>
                <ul className="app-panel__bullets">
                  {tag(panel.bulletsKey).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <div className="app-panel__tags">
                  {tag(panel.tagsKey).map((tg) => (
                    <span key={tg} className="tag">{tg}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — 快捷键 */}
      <section className="section section--bordered">
        <div className="container">
          <div className="section__head" data-reveal>
            <div>
              <span className="eyebrow">{t("app.section.shortcuts.eyebrow")}</span>
              <h2>{t("app.section.shortcuts.title")}</h2>
            </div>
            <p>{t("app.section.shortcuts.subtitle")}</p>
          </div>

          <div className="shortcuts" data-reveal>
            {APP_SHORTCUTS.map((s) => (
              <div key={s.keys} className="shortcut">
                <kbd className="shortcut__keys">{s.keys}</kbd>
                <span className="shortcut__desc">{t(s.descKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--tight section--bordered">
        <div className="container cta">
          <div className="cta__copy" data-reveal>
            <span className="eyebrow">{t("app.cta.eyebrow")}</span>
            <h2 className="cta__title">{t("app.cta.title")}</h2>
            <p className="cta__subtitle">{t("app.cta.subtitle")}</p>
          </div>
          <a
            href="https://github.com/zheteng/EKeysApp"
            className="btn btn--primary cta__btn"
            data-reveal
            target="_blank"
            rel="noreferrer"
          >
            {t("app.cta.button")}
          </a>
        </div>
      </section>
    </>
  );
}
