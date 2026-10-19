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
 * - read-only layer（LAYER_CUSTOM，仅本地占位）：灰色 + 「lock」角标
 *
 * 单击 / Enter / Space 触发 onSelect(slot)。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import {
  BUILTIN_FUNCTIONS,
  hidLabel,
  LAYER_CUSTOM,
  MACRO_DEFAULT_MS,
  MAX_MACRO_STEPS,
  MAX_NORMAL_KEYS,
  PHYSICAL_KEY_COUNT,
  SYNCED_LAYERS,
  type KeyAction,
  type KeymapData,
} from "../../protocol";

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
  funKey1 = 0,
  funKey2 = 0,
  onSelect,
}: {
  draft: KeymapData;
  snapshot: KeymapData;
  layer: number;
  selected: number | null;
  dirtyKeys: number[];
  /** 当前 FUN 键分配（物理键号 0=未分配），用于角标展示。 */
  funKey1?: number;
  funKey2?: number;
  onSelect: (slot: number) => void;
}) {
  const { t } = useI18n();
  const dirtySet = new Set(dirtyKeys);

  const layerLocked = !SYNCED_LAYERS.includes(layer) || layer === LAYER_CUSTOM;
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
          const funRole = funKey1 === slotIdx + 1 ? "F1" : funKey2 === slotIdx + 1 ? "F2" : "";
          // FUN 键本体：键帽直接显示 FUN 角色，不显示「未绑定」——
          // 其组合层绑定会被清空、单击输出被固件抑制（与 App 端键帽角标语义一致）。
          const label = funRole ? `FUN${funRole.slice(1)}` : describeAction(action, t);
          const wire = funRole ? "" : wireSummary(action);
          return (
            <button
              key={cell.slot}
              type="button"
              role="gridcell"
              className={`keymap-key ${selectedCls} ${dirtyCls} ${lockedCls}`}
              onClick={() => onSelect(slotIdx)}
              disabled={layerLocked}
              aria-pressed={selected === slotIdx}
              aria-label={`Key ${cell.label}${funRole ? ` (${funRole})` : ""} – ${label}`}
            >
              <span className="keymap-key__num mono">#{cell.label}</span>
              {funRole && (
                <span className="keymap-key__fun mono" title={t("keymap.fun.title")}>
                  {funRole}
                </span>
              )}
              <span className="keymap-key__label">{label}</span>
              {wire && wire !== label && (
                <span className="keymap-key__wire mono">{wire}</span>
              )}
              {dirty && <span className="keymap-key__dirty-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 把动作压缩成网格里能放下的摘要（≤14 字符），显示按键字符而非 HID code。 */
function wireSummary(a: KeyAction): string {
  const label = (c: number) => hidLabel(c) ?? `0x${c.toString(16).padStart(2, "0")}`;
  let raw: string;
  switch (a.kind) {
    case "keyboard":
      raw = label(a.code);
      break;
    case "combo":
      raw = a.codes.slice(0, MAX_NORMAL_KEYS).map(label).join("+");
      break;
    case "macro":
      raw = a.steps
        .slice(0, MAX_MACRO_STEPS)
        .map((s) => {
          const l =
            s.shift && s.code >= 0x04 && s.code <= 0x1d
              ? String.fromCharCode(65 + (s.code - 0x04))
              : label(s.code);
          return s.delayMs === MACRO_DEFAULT_MS ? l : `${l}:${s.delayMs}`;
        })
        .join("+");
      break;
    case "text":
      raw = a.text;
      break;
    case "builtin":
      raw = a.name;
      break;
    default:
      raw = "";
  }
  if (raw.length <= 14) return raw;
  return raw.slice(0, 13) + "…";
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
    case "combo":
      return a.codes
        .map((c) => hidLabel(c) ?? `0x${c.toString(16).padStart(2, "0")}`)
        .join("+");
    case "text":
      return `“${a.text.slice(0, 8)}${a.text.length > 8 ? "…" : ""}”`;
    case "macro":
      return t("keymap.key.macroPlaceholder");
    case "builtin": {
      // 已知内建功能用译名；未知串原样展示（透传保留，固件不解析）
      if (!(BUILTIN_FUNCTIONS as readonly string[]).includes(a.name)) return a.name;
      return t("keymap.bind.builtin");
    }
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
