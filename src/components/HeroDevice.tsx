import { useI18n } from "../i18n/useI18n.tsx";

/**
 * HeroDevice — 首页 hero 区域右侧的设备展示。
 */
export default function HeroDevice() {
  const { t } = useI18n();

  return (
    <div className="hero__device" aria-hidden="true" data-reveal>
      <span className="hero__device-tag">{t("hero.device.tag")}</span>
      <div className="macropad">
        <div className="macropad__screen" aria-hidden="true">
          <span className="macropad__screen-label">EKeys</span>
        </div>
        <div className="macropad__keys">
          <div className="macropad__key">01</div>
          <div className="macropad__key">02</div>
          <div className="macropad__key">03</div>
          <div className="macropad__key macropad__key--encoder" aria-label="encoder">
            <span className="macropad__encoder-dot" />
          </div>
          <div className="macropad__key">05</div>
          <div className="macropad__key">06</div>
          <div className="macropad__key">07</div>
          <div className="macropad__key">08</div>
          <div className="macropad__key">09</div>
          <div className="macropad__key">10</div>
          <div className="macropad__key">11</div>
          <div className="macropad__key">12</div>
        </div>
      </div>
    </div>
  );
}
