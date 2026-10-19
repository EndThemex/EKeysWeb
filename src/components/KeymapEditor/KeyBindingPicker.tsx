/**
 * KeyBindingPicker — Keymap 抽屉：编辑选中物理键的 KeyAction。
 *
 * 支持 6 种动作（与 App 端 KeyAction 一致）：未绑定 / 键盘键 / 组合键 /
 * 文本注入 / 宏序列 / 内建功能。
 *
 * 固件支持矩阵（2026-10 协议，与 cmd_keymap.cpp 对齐）：
 *  - 键盘键 / 组合键 / 文本注入 / 宏序列 / 内建功能：原生支持，无损回读；
 *    宏仅 Base 层（combo 层无宏通道，allowMacro=false 时隐藏）；
 *    下发一律 0xNN 字面量（固件不解析 Tab/Esc 等扩展键名）；
 *  - 内建功能串原样透传：未知串固件不解析（按键无效），但 GET → 应用 → SET
 *    往返不丢失（与 App 端 KeyAction::Function(String) 一致）。
 *
 * FUN 角色区：为选中键分配 / 取消 FUN1/FUN2（与 App 端 set_fun_key 语义一致，
 * 冲突互斥与孤儿绑定清理在 useKeymap.setFunKey 内完成）。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import { NumberRow, SelectRow, SwitchRow, TextRow } from "../settings/controls";
import {
  BUILTIN_FUNCTIONS,
  HID_KEY_CHOICES,
  hidWireName,
  MACRO_DEFAULT_MS,
  MACRO_MAX_MS,
  MAX_MACRO_STEPS,
  MAX_NORMAL_KEYS,
  MAX_TEXT_LEN,
  type BuiltinFunctionName,
  type ComboAction,
  type KeyAction,
  type MacroAction,
  type TextAction,
} from "../../protocol";

export type BindingKind = KeyAction["kind"];

const BINDING_KINDS: BindingKind[] = [
  "unbound",
  "keyboard",
  "combo",
  "text",
  "macro",
  "builtin",
];

const BUILTIN_NAME_KEYS: Record<BuiltinFunctionName, string> = {
  KEY_FUNCTION_ASR: "keymap.builtin.asr",
  KEY_FUNCTION_PAGE_PC: "keymap.builtin.pagePc",
  KEY_FUNCTION_PAGE_MUSIC: "keymap.builtin.pageMusic",
  KEY_FUNCTION_PAGE_AUDIO: "keymap.builtin.pageAudio",
  KEY_FUNCTION_PAGE_KEYMAP: "keymap.builtin.pageKeymap",
  KEY_FUNCTION_PAGE_SETTING: "keymap.builtin.pageSetting",
  KEY_FUNCTION_PAGE_HA: "keymap.builtin.pageHa",
};

/** 字母键区间（宏 Shift 勾选有意义）。 */
function isLetterCode(code: number): boolean {
  return code >= 0x04 && code <= 0x1d;
}

/**
 * 按键字符下拉：显示字符标签（a / 1 / Enter / Ctrl…）而非 HID code。
 * 设备回读到下拉未收录的键（如 0x4f）时，追加一项 hex 标签保证往返不丢。
 */
function KeyCodeSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const known = HID_KEY_CHOICES.some((c) => c.code === value);
  const options = [
    ...HID_KEY_CHOICES.map((c) => ({ value: c.code, label: c.label })),
    ...(known ? [] : [{ value, label: hidWireName(value) }]),
  ];
  return (
    <SelectRow<number>
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export function KeyBindingPicker({
  slot,
  action,
  onChange,
  disabled,
  allowMacro = true,
  funKey1 = 0,
  funKey2 = 0,
  onSetFunKey,
}: {
  slot: number | null;
  action: KeyAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
  /** 组合层无宏通道：false 时隐藏"宏序列"选项并把已选宏回退为 unbound。 */
  allowMacro?: boolean;
  /** 当前 draft 的 FUN 键分配（物理键号 0=未分配）。 */
  funKey1?: number;
  funKey2?: number;
  /** 分配 / 取消 FUN 键角色（side=1|2，phys=0 取消）。 */
  onSetFunKey?: (side: 1 | 2, phys: number) => void;
}) {
  const { t } = useI18n();

  const kinds = BINDING_KINDS.filter((k) => k !== "macro" || allowMacro);
  const kindOptions = kinds.map((k) => ({
    value: k,
    label: t(`keymap.bind.${k}`),
  }));

  function setKind(k: BindingKind) {
    if (k === action.kind) return;
    if (k === "macro" && !allowMacro) return;
    switch (k) {
      case "unbound":
        onChange({ kind: "unbound" });
        return;
      case "keyboard":
        onChange({ kind: "keyboard", code: 0x04 });
        return;
      case "combo":
        onChange({ kind: "combo", codes: [0xe0, 0x06] }); // Ctrl+c
        return;
      case "text":
        onChange({ kind: "text", text: "" });
        return;
      case "macro":
        onChange({ kind: "macro", steps: [{ code: 0x04, delayMs: MACRO_DEFAULT_MS }] });
        return;
      case "builtin":
        onChange({ kind: "builtin", name: "KEY_FUNCTION_ASR" });
        return;
    }
  }

  // 组合层切到宏时回退为 unbound（无宏通道）
  const effective: KeyAction =
    action.kind === "macro" && !allowMacro ? { kind: "unbound" } : action;

  // 未知内建功能串：SelectRow 无法表达，用只读文本展示（原样透传保留）
  const isKnownBuiltin =
    effective.kind === "builtin" &&
    (BUILTIN_FUNCTIONS as readonly string[]).includes(effective.name);

  const funRole: 0 | 1 | 2 =
    slot !== null && funKey1 === slot + 1
      ? 1
      : slot !== null && funKey2 === slot + 1
        ? 2
        : 0;

  return (
    <section className="keymap-picker card">
      <span className="eyebrow">
        {t("keymap.bind.title")}
        {slot !== null && (
          <span className="keymap-picker__slot mono"> · #{slot + 1}</span>
        )}
      </span>

      <SelectRow<BindingKind>
        label={t("keymap.bind.title")}
        value={effective.kind}
        options={kindOptions}
        onChange={setKind}
        disabled={disabled}
      />

      {effective.kind === "keyboard" && (
        <>
          <KeyCodeSelect
            label={t("keymap.key.select")}
            value={effective.code}
            onChange={(v) => onChange({ kind: "keyboard", code: v & 0xff })}
            disabled={disabled}
          />
          <TextRow
            label={t("keymap.encoded")}
            value={hidWireName(effective.code)}
            onChange={() => {
              /* 单向展示 */
            }}
            monospace
            disabled
          />
          <p className="hint">{t("keymap.code.hint")}</p>
        </>
      )}

      {effective.kind === "combo" && (
        <ComboFields action={effective} onChange={onChange} disabled={disabled} />
      )}

      {effective.kind === "text" && (
        <TextFields action={effective} onChange={onChange} disabled={disabled} />
      )}

      {effective.kind === "macro" && (
        <MacroFields action={effective} onChange={onChange} disabled={disabled} />
      )}

      {effective.kind === "builtin" && isKnownBuiltin && (
        <>
          <SelectRow<BuiltinFunctionName>
            label={t("keymap.builtin.label")}
            value={effective.name as BuiltinFunctionName}
            options={BUILTIN_FUNCTIONS.map((name) => ({
              value: name,
              label: t(BUILTIN_NAME_KEYS[name]),
            }))}
            onChange={(v) => onChange({ kind: "builtin", name: v })}
            disabled={disabled}
          />
          <TextRow
            label={t("keymap.encoded")}
            value={effective.name}
            onChange={() => {
              /* */
            }}
            monospace
            disabled
          />
          <p className="hint">{t("keymap.builtin.hint")}</p>
        </>
      )}

      {effective.kind === "builtin" && !isKnownBuiltin && (
        <>
          <TextRow
            label={t("keymap.builtin.label")}
            value={effective.name}
            onChange={(v) => onChange({ kind: "builtin", name: v })}
            monospace
            disabled={disabled}
          />
          <p className="hint hint--warn">{t("keymap.builtin.rawHint")}</p>
        </>
      )}

      {effective.kind === "unbound" && (
        <p className="hint">{t("keymap.bind.none")}</p>
      )}

      {onSetFunKey && slot !== null && (
        <div className="keymap-macro">
          <span className="settings-card__title">{t("keymap.fun.title")}</span>
          <p className="hint">{t("keymap.fun.hint")}</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={disabled || funRole === 1}
              onClick={() => onSetFunKey(1, funRole === 1 ? 0 : slot + 1)}
            >
              {t("keymap.fun.set1")}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={disabled || funRole === 2}
              onClick={() => onSetFunKey(2, funRole === 2 ? 0 : slot + 1)}
            >
              {t("keymap.fun.set2")}
            </button>
          </div>
          {funRole !== 0 && (
            <p className="hint">
              {t("keymap.fun.self").replace("{side}", String(funRole))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * 组合键（normal "+" 序列，≤ MAX_NORMAL_KEYS 个 HID code）
 * ============================================================ */

function ComboFields({
  action,
  onChange,
  disabled,
}: {
  action: ComboAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  function setCode(idx: number, code: number) {
    const codes = action.codes.slice();
    codes[idx] = code;
    onChange({ kind: "combo", codes });
  }
  function remove(idx: number) {
    const codes = action.codes.slice();
    codes.splice(idx, 1);
    onChange({ kind: "combo", codes });
  }
  function add() {
    onChange({ kind: "combo", codes: action.codes.concat(0xe0) });
  }
  return (
    <>
      <div className="keymap-macro">
        <span className="settings-card__title">{t("keymap.combo.keys")}</span>
        {action.codes.map((c, i) => (
          <div key={i} className="keymap-macro__step">
            <span className="keymap-macro__index mono">#{i + 1}</span>
            <KeyCodeSelect
              label={t("keymap.key.select")}
              value={c}
              onChange={(v) => setCode(i, v & 0xff)}
              disabled={disabled}
            />
            <span className="keymap-macro__wire mono">{hidWireName(c)}</span>
            <button
              type="button"
              className="btn btn--ghost keymap-macro__remove"
              onClick={() => remove(i)}
              disabled={disabled}
            >
              {t("keymap.macro.removeStep")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={add}
          disabled={disabled || action.codes.length >= MAX_NORMAL_KEYS}
        >
          {t("keymap.combo.addKey")}
        </button>
      </div>
      <TextRow
        label={t("keymap.encoded")}
        value={action.codes.map((c) => hidWireName(c)).join("+")}
        onChange={() => {
          /* */
        }}
        monospace
        disabled
      />
      <p className="hint">{t("keymap.combo.hint")}</p>
    </>
  );
}

/* ============================================================
 * 文本注入（ASCII ≤ MAX_TEXT_LEN）
 * ============================================================ */

function TextFields({
  action,
  onChange,
  disabled,
}: {
  action: TextAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const nonAscii = /[^\x20-\x7e]/.test(action.text);
  const overLimit = action.text.length > MAX_TEXT_LEN;
  return (
    <>
      <TextRow
        label={t("keymap.text.label")}
        value={action.text}
        onChange={(v) => onChange({ kind: "text", text: v })}
        disabled={disabled}
      />
      <p className={`hint ${overLimit ? "hint--warn" : ""}`}>
        {t("keymap.text.hint")} ({action.text.length}/{MAX_TEXT_LEN})
      </p>
      {nonAscii && <p className="hint hint--warn">{t("keymap.text.warn")}</p>}
    </>
  );
}

/* ============================================================
 * 宏序列（≤ MAX_MACRO_STEPS 步：按下→间隔→释放）
 * ============================================================ */

function MacroFields({
  action,
  onChange,
  disabled,
}: {
  action: MacroAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  function update(
    idx: number,
    patch: Partial<{ code: number; shift: boolean; delayMs: number }>,
  ) {
    const steps = action.steps.slice();
    const cur = steps[idx] ?? { code: 0x04, delayMs: MACRO_DEFAULT_MS };
    steps[idx] = { ...cur, ...patch };
    onChange({ kind: "macro", steps });
  }
  function remove(idx: number) {
    const steps = action.steps.slice();
    steps.splice(idx, 1);
    onChange({ kind: "macro", steps });
  }
  function add() {
    if (action.steps.length >= MAX_MACRO_STEPS) return;
    onChange({
      kind: "macro",
      steps: action.steps.concat({ code: 0x04, delayMs: MACRO_DEFAULT_MS }),
    });
  }
  return (
    <>
      <div className="keymap-macro">
        <span className="settings-card__title">
          {t("keymap.macro.steps")} ({action.steps.length}/{MAX_MACRO_STEPS})
        </span>
        {action.steps.length === 0 && (
          <p className="hint">{t("keymap.bind.none")}</p>
        )}
        {action.steps.map((s, i) => (
          <div key={i} className="keymap-macro__step">
            <span className="keymap-macro__index mono">#{i + 1}</span>
            <KeyCodeSelect
              label={t("keymap.key.select")}
              value={s.code}
              onChange={(v) => update(i, { code: v & 0xff })}
              disabled={disabled}
            />
            <span className="keymap-macro__wire mono">{hidWireName(s.code)}</span>
            {isLetterCode(s.code) && (
              <SwitchRow
                label={t("keymap.macro.shift")}
                checked={Boolean(s.shift)}
                onChange={(v) => update(i, { shift: v })}
                disabled={disabled}
              />
            )}
            <NumberRow
              label={t("keymap.macro.delay")}
              value={s.delayMs}
              min={0}
              max={MACRO_MAX_MS}
              step={10}
              onChange={(v) => update(i, { delayMs: Math.max(0, Math.min(MACRO_MAX_MS, v)) })}
              disabled={disabled}
              unit={t("settings.unit.ms")}
            />
            <button
              type="button"
              className="btn btn--ghost keymap-macro__remove"
              onClick={() => remove(i)}
              disabled={disabled}
            >
              {t("keymap.macro.removeStep")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={add}
          disabled={disabled || action.steps.length >= MAX_MACRO_STEPS}
        >
          {t("keymap.macro.addStep")}
        </button>
      </div>
      <TextRow
        label={t("keymap.encoded")}
        value={action.steps
          .map((s) => {
            const name =
              s.shift && isLetterCode(s.code)
                ? String.fromCharCode(65 + (s.code - 0x04)).toUpperCase()
                : hidWireName(s.code);
            return s.delayMs === MACRO_DEFAULT_MS ? name : `${name}:${s.delayMs}`;
          })
          .join("+") || t("keymap.bind.none")}
        onChange={() => {
          /* */
        }}
        monospace
        disabled
      />
      <p className="hint">{t("keymap.macro.hint")}</p>
    </>
  );
}
