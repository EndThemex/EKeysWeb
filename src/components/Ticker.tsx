import { useI18n } from "../i18n/useI18n.tsx";

/**
 * Ticker — 顶部跑马灯。在 4 个页面重复使用。
 */
export default function Ticker() {
  const { t } = useI18n();
  const text = t("ticker.line");
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}