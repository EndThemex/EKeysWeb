/**
 * LayerSelector — 4 个 layer 切换按钮（Base / Fun1 / Fun2 / Custom）。
 *
 * 可编辑性（与 App 端 panel_keymap 一致）：
 * - Base：始终可编辑；
 * - Fun1/Fun2：对应 FUN 键已分配且当前选中键不是 FUN 键本身
 *   （FUN 键按住时进入组合层，自身在组合层无输出）；
 * - Custom：仅本地占位，只读。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import { LAYER_BASE, LAYER_CUSTOM, LAYER_FUN1, LAYER_FUN2 } from "../../protocol";

export function LayerSelector({
  layer,
  selectedSlot,
  funKey1 = 0,
  funKey2 = 0,
  onChange,
}: {
  layer: number;
  /** 当前选中的物理键 slot（0 基），null 表示未选中。 */
  selectedSlot: number | null;
  /** FUN 键分配（物理键号 1..11，0=未分配）。 */
  funKey1?: number;
  funKey2?: number;
  onChange: (next: number) => void;
}) {
  const { t } = useI18n();

  const layers: ReadonlyArray<{
    idx: number;
    i18n: string;
    editable: boolean;
    lockedHint: string;
  }> = [
    { idx: LAYER_BASE, i18n: "keymap.layer.base", editable: true, lockedHint: "" },
    {
      idx: LAYER_FUN1,
      i18n: "keymap.layer.fun1",
      editable: funKey1 !== 0 && selectedSlot !== funKey1 - 1,
      lockedHint:
        funKey1 === 0 ? "keymap.layer.needFun" : "keymap.layer.funSelf",
    },
    {
      idx: LAYER_FUN2,
      i18n: "keymap.layer.fun2",
      editable: funKey2 !== 0 && selectedSlot !== funKey2 - 1,
      lockedHint:
        funKey2 === 0 ? "keymap.layer.needFun" : "keymap.layer.funSelf",
    },
    {
      idx: LAYER_CUSTOM,
      i18n: "keymap.layer.custom",
      editable: false,
      lockedHint: "keymap.layer.lockedHint",
    },
  ];

  return (
    <div className="keymap-layers" role="tablist" aria-label={t("keymap.layer.label")}>
      <span className="settings-card__title">{t("keymap.layer.label")}</span>
      <div className="keymap-layers__buttons">
        {layers.map((l) => (
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
            title={l.editable ? t(l.i18n) : t(l.lockedHint)}
          >
            {t(l.i18n)}
          </button>
        ))}
      </div>
    </div>
  );
}
