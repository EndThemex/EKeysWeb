/**
 * KeyBindingPicker — Keymap 抽屉：编辑选中物理键的 KeyAction。
 *
 * 支持 5 种动作：未绑定 / 键盘键 / 媒体键 / 鼠标 / 层切换 / 宏；
 * 受 §10.4 模型限制：Media / Mouse / LayerSwitch / Macro 通过 `function`
 * 字段尽力编码，固件当前不会解析（下次 GET 回来会被还原为 unbound），
 * 因此 UI 必须在「写入」/「读取」时显式提示这一点。
 */

import { useI18n } from "../../i18n/useI18n.tsx";
import { NumberRow, SelectRow, TextRow } from "../settings/controls";
import {
  hidLabel,
  type KeyAction,
  type LayerSwitchAction,
  type MacroAction,
  type MouseAction,
} from "../../protocol";

export type BindingKind = KeyAction["kind"];

const BINDING_KINDS: BindingKind[] = [
  "unbound",
  "keyboard",
  "media",
  "mouse",
  "layer-switch",
  "macro",
];

const MOUSE_BUTTON_KEYS = [
  "keymap.mouse.button.left",
  "keymap.mouse.button.right",
  "keymap.mouse.button.middle",
] as const;
const MOUSE_BUTTON_VALUES = [1, 2, 3];

const LAYER_TARGET_KEYS = [
  "keymap.layer.base",
  "keymap.layer.fun1",
  "keymap.layer.fun2",
  "keymap.layer.custom",
] as const;

const LAYER_MODE_KEYS = [
  "keymap.layer.mode.momentary",
  "keymap.layer.mode.toggle",
] as const;

export function KeyBindingPicker({
  slot,
  action,
  onChange,
  disabled,
}: {
  slot: number | null;
  action: KeyAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  const kindOptions = BINDING_KINDS.map((k) => ({
    value: k,
    label: t(`keymap.bind.${k}`),
  }));

  function setKind(k: BindingKind) {
    if (k === action.kind) return;
    switch (k) {
      case "unbound":
        onChange({ kind: "unbound" });
        return;
      case "keyboard":
        onChange({ kind: "keyboard", code: 0x04 });
        return;
      case "media":
        onChange({ kind: "media", code: 0xe9 });
        return;
      case "mouse":
        onChange({ kind: "mouse", button: 1, clicks: 1 });
        return;
      case "layer-switch":
        onChange({ kind: "layer-switch", target: 1, mode: "momentary" });
        return;
      case "macro":
        onChange({ kind: "macro", steps: [] });
        return;
    }
  }

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
        value={action.kind}
        options={kindOptions}
        onChange={setKind}
        disabled={disabled}
      />

      {action.kind === "keyboard" && (
        <>
          <NumberRow
            label={t("keymap.code.label")}
            value={action.code}
            min={0}
            max={0xff}
            step={1}
            onChange={(v) => onChange({ kind: "keyboard", code: v & 0xff })}
            disabled={disabled}
          />
          <TextRow
            label={t("keymap.encoded")}
            value={hidLabel(action.code) ?? `0x${action.code.toString(16).padStart(2, "0")}`}
            onChange={() => {
              /* 单向展示 */
            }}
            monospace
            disabled
          />
          <p className="hint">{t("keymap.code.hint")}</p>
        </>
      )}

      {action.kind === "media" && (
        <>
          <NumberRow
            label={t("keymap.media.label")}
            value={action.code}
            min={0}
            max={0xffff}
            step={1}
            onChange={(v) => onChange({ kind: "media", code: v & 0xffff })}
            disabled={disabled}
          />
          <TextRow
            label={t("keymap.encoded")}
            value={`media(0x${action.code.toString(16)})`}
            onChange={() => {
              /* */
            }}
            monospace
            disabled
          />
          <p className="hint">{t("keymap.media.hint")}</p>
          <p className="hint hint--warn">{t("keymap.firmwareLoss")}</p>
        </>
      )}

      {action.kind === "mouse" && (
        <>
          <SelectRow
            label={t("keymap.mouse.button")}
            value={action.button}
            options={MOUSE_BUTTON_KEYS.map((k, i) => ({
              value: MOUSE_BUTTON_VALUES[i],
              label: t(k),
            }))}
            onChange={(v) => onChange({ kind: "mouse", button: v as number, clicks: action.clicks })}
            disabled={disabled}
          />
          <NumberRow
            label={t("keymap.mouse.clicks")}
            value={action.clicks ?? 1}
            min={1}
            max={10}
            step={1}
            onChange={(v) =>
              onChange({
                kind: "mouse",
                button: action.button,
                clicks: Math.max(1, Math.min(10, v)),
              })
            }
            disabled={disabled}
          />
          <TextRow
            label={t("keymap.encoded")}
            value={`mouse(button=${action.button},clicks=${action.clicks ?? 1})`}
            onChange={() => {
              /* */
            }}
            monospace
            disabled
          />
          <p className="hint hint--warn">{t("keymap.firmwareLoss")}</p>
        </>
      )}

      {action.kind === "layer-switch" && (
        <LayerSwitchFields action={action} onChange={onChange} disabled={disabled} />
      )}

      {action.kind === "macro" && (
        <MacroFields action={action} onChange={onChange} disabled={disabled} />
      )}

      {action.kind === "unbound" && (
        <p className="hint">{t("keymap.bind.none")}</p>
      )}
    </section>
  );
}

function LayerSwitchFields({
  action,
  onChange,
  disabled,
}: {
  action: LayerSwitchAction;
  onChange: (next: KeyAction) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <SelectRow
        label={t("keymap.layer.target")}
        value={action.target}
        options={LAYER_TARGET_KEYS.map((k, i) => ({ value: i, label: t(k) }))}
        onChange={(v) => onChange({ kind: "layer-switch", target: v as number, mode: action.mode })}
        disabled={disabled}
      />
      <SelectRow
        label={t("keymap.layer.mode")}
        value={action.mode}
        options={LAYER_MODE_KEYS.map((k) => ({ value: k.split(".").pop()!, label: t(k) }))}
        onChange={(v) =>
          onChange({
            kind: "layer-switch",
            target: action.target,
            mode: v === "toggle" ? "toggle" : "momentary",
          })
        }
        disabled={disabled}
      />
      <TextRow
        label={t("keymap.encoded")}
        value={`layer(target=${action.target},mode=${action.mode})`}
        onChange={() => {
          /* */
        }}
        monospace
        disabled
      />
      <p className="hint hint--warn">{t("keymap.firmwareLoss")}</p>
    </>
  );
}

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
  function update(idx: number, patch: Partial<{ delayMs: number; action: KeyAction }>) {
    const steps = action.steps.slice();
    const cur = steps[idx] ?? { action: { kind: "unbound" } as KeyAction };
    steps[idx] = { ...cur, ...patch };
    onChange({ kind: "macro", steps });
  }
  function remove(idx: number) {
    const steps = action.steps.slice();
    steps.splice(idx, 1);
    onChange({ kind: "macro", steps });
  }
  function add() {
    const steps = action.steps.concat({
      action: { kind: "keyboard", code: 0x04 } as KeyAction,
      delayMs: 0,
    });
    onChange({ kind: "macro", steps });
  }
  return (
    <>
      <div className="keymap-macro">
        <span className="settings-card__title">{t("keymap.macro.steps")}</span>
        {action.steps.length === 0 && (
          <p className="hint">{t("keymap.bind.none")}</p>
        )}
        {action.steps.map((s, i) => (
          <div key={i} className="keymap-macro__step">
            <span className="keymap-macro__index mono">#{i + 1}</span>
            <SelectRow
              label={t("keymap.bind.title")}
              value={s.action.kind}
              options={BINDING_KINDS.map((k) => ({
                value: k,
                label: t(`keymap.bind.${k}`),
              }))}
              onChange={(v) =>
                update(i, {
                  action:
                    v === "keyboard"
                      ? { kind: "keyboard", code: 0x04 }
                      : v === "media"
                      ? { kind: "media", code: 0xe9 }
                      : v === "mouse"
                      ? { kind: "mouse", button: 1 }
                      : v === "layer-switch"
                      ? { kind: "layer-switch", target: 1, mode: "momentary" }
                      : v === "macro"
                      ? { kind: "macro", steps: [] }
                      : { kind: "unbound" },
                })
              }
              disabled={disabled}
            />
            <NumberRow
              label={t("keymap.macro.delay")}
              value={s.delayMs ?? 0}
              min={0}
              max={60000}
              step={10}
              onChange={(v) => update(i, { delayMs: Math.max(0, Math.min(60000, v)) })}
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
          disabled={disabled}
        >
          {t("keymap.macro.addStep")}
        </button>
      </div>
      <TextRow
        label={t("keymap.encoded")}
        value={`macro(steps=${action.steps.length})`}
        onChange={() => {
          /* */
        }}
        monospace
        disabled
      />
      <p className="hint hint--warn">{t("keymap.firmwareLoss")}</p>
    </>
  );
}
