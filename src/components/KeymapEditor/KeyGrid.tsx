/**
 * KeyGrid — 11 键可视化栅格（3×4，第一行第四列固定为旋钮）。
 *
 * 物理布局（与设计文档 §10 / EKeysApp panel_keymap 对齐）：
 *
 *  [ 1 ] [ 2 ] [ 3 ] [ENC]
 *  [ 4 ] [ 5 ] [ 6 ] [ 7 ]
 *  [ 8 ] [ 9 ] [10 ] [11 ]
 *
 * - 选中：accent 高亮 + 描边
 * - dirty：琥珀色左下小点（来自 draft ≠ snapshot）
 * - read-only layer（非 LAYER_BASE）：灰色 + 「lock」角标
 *
 * 单击 / Enter / Space 触发 onSelect(slot)。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import {
  hidLabel,
  LAYER_BASE,
  PHYSICAL_KEY_COUNT,
  type KeyAction,
  type KeymapData,
} from "../../protocol";
import { actionToFirmware } from "../../protocol/keymap";

/**
 * 物理键 → (row, col)；encoder 占 (0, 3)（第一行第四个位置），
 * 跳过该槽后按 (row, col) 升序编号 1..11。
 */
const LAYOUT: ReadonlyArray<{ slot: number; row: number; col: number; label: string }> = [
  { slot: 0, row: 0, col: 0, label: "1" },
  { slot: 1, row: 0, col: 1, label: "2" },
  { slot: 2, row: 0, col: 2, label: "3" },
  // (0, 3) → encoder 占位，下方单独渲染
  { slot: 3, row: 1, col: 0, label: "4" },
  { slot: 4, row: 1, col: 1, label: "5" },
  { slot: 5, row: 1, col: 2, label: "6" },
  { slot: 6, row: 1, col: 3, label: "7" },
  { slot: 7, row: 2, col: 0, label: "8" },
  { slot: 8, row: 2, col: 1, label: "9" },
  { slot: 9, row: 2, col: 2, label: "10" },
  { slot: 10, row: 2, col: 3, label: "11" },
];

const ROWS = 3;
const COLS = 4;
/** encoder 所在的列索引（第一行第四列）。 */
const ENCODER_COL = 3;
/** encoder 所在的行索引。 */
const ENCODER_ROW = 0;

export function KeyGrid({
  draft,
  snapshot,
  layer,
  selected,
  dirtyKeys,
  onSelect,
  onClearLayer,
}: {
  draft: KeymapData;
  snapshot: KeymapData;
  layer: number;
  selected: number | null;
  dirtyKeys: number[];
  onSelect: (slot: number) => void;
  onClearLayer?: () => void;
}) {
  const { t } = useI18n();
  const dirtySet = new Set(dirtyKeys);

  const layerLocked = layer !== LAYER_BASE;
  const slotArr = draft.layers[layer]?.slots ?? [];

  return (
    <div className="keymap-board">
      {layerLocked && (
        <p className="hint hint--warn keymap-board__lock">{t("keymap.layer.lockedHint")}</p>
      )}
      <div
        className="keymap-grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
        role="grid"
        aria-label={t("keymap.title")}
      >
        {/* 按 (row, col) 升序遍历 3×4 网格：(0,3) 为旋钮，其余为可绑定键 */}
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const row = Math.floor(idx / COLS);
          const col = idx % COLS;
          if (row === ENCODER_ROW && col === ENCODER_COL) {
            return (
              <div
                key="encoder"
                className="keymap-key keymap-key--encoder"
                aria-label="Encoder"
                role="gridcell"
              >
                <span className="keymap-key__num mono">ENC</span>
                <span className="keymap-key__label">—</span>
              </div>
            );
          }
          const cell = LAYOUT.find((c) => c.row === row && c.col === col);
          if (!cell) return null;
          const slotIdx = cell.slot;
          const action = slotArr[slotIdx] ?? ({ kind: "unbound" } as KeyAction);
          const dirty = dirtySet.has(slotIdx + 1);
          const selectedCls = selected === slotIdx ? "is-selected" : "";
          const dirtyCls = dirty ? "is-dirty" : "";
          const lockedCls = layerLocked ? "is-locked" : "";
          const encoded = actionToFirmware(action);
          return (
            <button
              key={cell.slot}
              type="button"
              role="gridcell"
              className={`keymap-key ${selectedCls} ${dirtyCls} ${lockedCls}`}
              onClick={() => onSelect(slotIdx)}
              disabled={layerLocked}
              aria-pressed={selected === slotIdx}
              aria-label={`Key ${cell.label} – ${describeAction(action, t)}`}
            >
              <span className="keymap-key__num mono">#{cell.label}</span>
              <span className="keymap-key__label">{describeAction(action, t)}</span>
              <span className="keymap-key__wire mono">
                {encoded.normal || (encoded.function ? encoded.function : t("keymap.key.unbound"))}
              </span>
              {dirty && <span className="keymap-key__dirty-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="keymap-board__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClearLayer}
          disabled={layerLocked || slotArr.every((s) => s.kind === "unbound")}
        >
          {t("keymap.bind.unbound")}
        </button>
      </div>
    </div>
  );
}

function describeAction(
  a: KeyAction,
  t: (k: string) => string,
): string {
  switch (a.kind) {
    case "unbound":
      return t("keymap.key.unbound");
    case "keyboard": {
      const friendly = hidLabel(a.code);
      if (friendly) return friendly;
      return `0x${a.code.toString(16).padStart(2, "0")}`;
    }
    case "media":
      return t("keymap.bind.media");
    case "mouse":
      return t("keymap.bind.mouse");
    case "layer-switch":
      return t("keymap.bind.layerSwitch");
    case "macro":
      return t("keymap.key.macroPlaceholder");
    case "fun-modifier":
      return a.slot === 0 ? t("keymap.bind.unbound") : `FUN${a.slot}`;
  }
}

/** 校验 layout 总数与 PHYSICAL_KEY_COUNT 一致，防止悄悄失配。 */
if (PHYSICAL_KEY_COUNT !== LAYOUT.length) {
  // 启动期自检：仅 dev 模式打印，不抛
  // eslint-disable-next-line no-console
  console.warn(
    `[KeyGrid] LAYOUT entries (${LAYOUT.length}) !== PHYSICAL_KEY_COUNT (${PHYSICAL_KEY_COUNT})`,
  );
}
