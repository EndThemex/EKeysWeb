/**
 * LayerSelector — 4 个 layer 切换按钮（Base / Fun1 / Fun2 / Custom）。
 *
 * M3 范围：仅 LAYER_BASE 可编辑；其它 layer 显示但 disabled。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import { LAYER_BASE, LAYER_CUSTOM, LAYER_FUN1, LAYER_FUN2 } from "../../protocol";

const LAYERS: ReadonlyArray<{ idx: number; i18n: string; editable: boolean }> = [
  { idx: LAYER_BASE, i18n: "keymap.layer.base", editable: true },
  { idx: LAYER_FUN1, i18n: "keymap.layer.fun1", editable: false },
  { idx: LAYER_FUN2, i18n: "keymap.layer.fun2", editable: false },
  { idx: LAYER_CUSTOM, i18n: "keymap.layer.custom", editable: false },
];

export function LayerSelector({
  layer,
  onChange,
}: {
  layer: number;
  onChange: (next: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="keymap-layers" role="tablist" aria-label={t("keymap.layer.label")}>
      <span className="settings-card__title">{t("keymap.layer.label")}</span>
      <div className="keymap-layers__buttons">
        {LAYERS.map((l) => (
          <button
            key={l.idx}
            type="button"
            role="tab"
            aria-selected={layer === l.idx}
            disabled={!l.editable}
            className={`keymap-layers__btn ${layer === l.idx ? "is-active" : ""} ${
              l.editable ? "" : "is-locked"
            }`}
            onClick={() => l.editable && onChange(l.idx)}
            title={l.editable ? t(l.i18n) : t("keymap.layer.lockedHint")}
          >
            {t(l.i18n)}
          </button>
        ))}
      </div>
    </div>
  );
}
