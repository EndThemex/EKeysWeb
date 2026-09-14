import { useEffect, useState } from "react";
import { useI18n } from "../i18n/useI18n.tsx";

/**
 * ScrollCue — 回到顶部按钮。
 * 滚动超过 600px 时显示。监听器使用 rAF 节流,避免在长页面
 * 上触发大量 setState。
 */
export default function ScrollCue() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setVisible(window.scrollY > 600);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      id="scrollCue"
      className={"scroll-cue" + (visible ? " is-visible" : "")}
      aria-label={t("a11y.scrollTop")}
      onClick={() =>
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    >
      ↑
    </button>
  );
}
