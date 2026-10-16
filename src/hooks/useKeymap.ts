/**
 * useKeymap — KeymapData 草稿管理 + 协议层同步。
 *
 * 草稿策略（与 useDeviceDraft 对齐）：
 * - draft 初始拷贝自 snapshot；
 * - setLayerSlot / setActiveProfile / setProfileName 合并到 draft；
 * - diffKeymap(draft, snapshot) 用于展示「将下发 N 键」；
 * - syncFromSnapshot 用于收到 0x87 / 0x10 推送时整体回填；
 * - reset 从 snapshot 重建 draft。
 *
 * 同步范围（2026-10 协议）：layer 0/1/2（Base/FUN1/FUN2）+ fun_key1/fun_key2；
 * layer 3（Custom）仅本地占位。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  diffKeymap,
  emptyKeymapData,
  SYNCED_LAYERS,
  PHYSICAL_KEY_COUNT,
  syncProfileFromSettings,
  type DeviceSettings,
  type KeyAction,
  type KeymapData,
} from "../protocol";

export interface UseKeymapResult {
  snapshot: KeymapData | null;
  draft: KeymapData | null;
  dirty: boolean;
  dirtyKeys: number[];
  /** 设置某个 (layer, slot) 的动作。 */
  setLayerSlot: (layer: number, slot: number, action: KeyAction) => void;
  /**
   * 分配 / 取消 FUN 键角色（side=1|2，phys=0 表示取消）。
   * 与 App 端 set_fun_key 一致：冲突互斥、取消/冲突时清空对应组合层孤儿绑定、
   * FUN 键自身的组合层绑定一并清除。
   */
  setFunKey: (side: 1 | 2, phys: number) => void;
  /** 切换正在编辑的 Profile（0..7），UI 仅改 draft，不发命令。 */
  setActiveProfile: (idx: number) => void;
  /** 设置 Profile 名称（≤ 32B）。 */
  setProfileName: (name: string) => void;
  /** 设置 has_custom_icon 标记位。 */
  setHasCustomIcon: (v: boolean) => void;
  /** 把 snapshot 同步为指定 KeymapData。 */
  syncFromSnapshot: (next: KeymapData) => void;
  /** 从 snapshot 重建 draft 并清空 dirty。 */
  reset: () => void;
}

export function useKeymap(
  initial: KeymapData | null,
  settings: DeviceSettings | null,
): UseKeymapResult {
  const initialSynced = useMemo(() => {
    if (initial) return syncProfileFromSettings(initial, settings);
    return null;
  }, [initial, settings]);

  const [snapshot, setSnapshot] = useState<KeymapData | null>(initialSynced);
  const [draft, setDraft] = useState<KeymapData | null>(initialSynced);

  // 镜像 snapshot 到 ref，syncFromSnapshot / reset 用最新值
  const snapRef = useRef<KeymapData | null>(initialSynced);
  useEffect(() => {
    snapRef.current = snapshot;
  }, [snapshot]);

  const dirty = useMemo(() => {
    if (!snapshot || !draft) return false;
    // 名称 / 图标 / activeProfile / funKey 也算 dirty
    if (snapshot.profileName !== draft.profileName) return true;
    if (snapshot.hasCustomIcon !== draft.hasCustomIcon) return true;
    if (snapshot.activeProfile !== draft.activeProfile) return true;
    if (snapshot.funKey1 !== draft.funKey1) return true;
    if (snapshot.funKey2 !== draft.funKey2) return true;
    return diffKeymap(draft, snapshot).changed;
  }, [snapshot, draft]);

  const dirtyKeys = useMemo(() => {
    if (!snapshot || !draft) return [];
    return diffKeymap(draft, snapshot).physical;
  }, [snapshot, draft]);

  const setLayerSlot = useCallback(
    (layer: number, slot: number, action: KeyAction) => {
      setDraft((prev) => {
        if (!prev) return prev;
        if (!SYNCED_LAYERS.includes(layer)) return prev; // 仅 layer 0/1/2 可编辑
        if (slot < 0 || slot >= PHYSICAL_KEY_COUNT) return prev;
        const layers = prev.layers.slice();
        const target = layers[layer];
        if (!target) return prev;
        const slots = target.slots.slice();
        slots[slot] = action;
        layers[layer] = { slots };
        return { ...prev, layers };
      });
    },
    [],
  );

  const setFunKey = useCallback((side: 1 | 2, physRaw: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const phys = clampFunKey(physRaw);
      const layer = side === 1 ? 1 : 2; // LAYER_FUN1 / LAYER_FUN2
      const cur = side === 1 ? prev.funKey1 : prev.funKey2;
      const next = structuredClone(prev);
      let conflictSide: 0 | 1 | 2 = 0;

      // 取消分配：清空该组合层全部孤儿绑定（避免重新分配后旧绑定突然生效）
      if (phys === 0) {
        if (cur !== 0) clearLayer(next, layer);
      }

      if (side === 1) {
        if (next.funKey1 !== phys) next.funKey1 = phys;
        if (phys !== 0 && next.funKey2 === phys) {
          next.funKey2 = 0;
          conflictSide = 2;
        }
      } else {
        if (next.funKey2 !== phys) next.funKey2 = phys;
        if (phys !== 0 && next.funKey1 === phys) {
          next.funKey1 = 0;
          conflictSide = 1;
        }
      }
      // 冲突被顶掉的一侧：清空其组合层绑定
      if (conflictSide !== 0) clearLayer(next, conflictSide === 1 ? 1 : 2);

      // 键成为 FUN 键后按住不再产生输出：其自身组合层绑定一并清除
      if (phys !== 0) {
        for (const l of [1, 2]) {
          const target = next.layers[l];
          if (target) {
            const slots = target.slots.slice();
            if (slots[phys - 1] && slots[phys - 1].kind !== "unbound") {
              slots[phys - 1] = { kind: "unbound" };
              next.layers[l] = { slots };
            }
          }
        }
      }
      return next;
    });
  }, []);

  const setActiveProfile = useCallback((idx: number) => {
    setDraft((prev) => (prev ? { ...prev, activeProfile: clampProfile(idx) } : prev));
  }, []);

  const setProfileName = useCallback((name: string) => {
    setDraft((prev) =>
      prev ? { ...prev, profileName: clampString(name, 32) } : prev,
    );
  }, []);

  const setHasCustomIcon = useCallback((v: boolean) => {
    setDraft((prev) => (prev ? { ...prev, hasCustomIcon: Boolean(v) } : prev));
  }, []);

  const syncFromSnapshot = useCallback((next: KeymapData) => {
    const synced = syncProfileFromSettings(next, null);
    snapRef.current = synced;
    setSnapshot(synced);
    setDraft(synced);
  }, []);

  const reset = useCallback(() => {
    const snap = snapRef.current;
    if (snap) {
      setDraft(snap);
    } else {
      const empty = emptyKeymapData();
      setDraft(empty);
    }
  }, []);

  return {
    snapshot,
    draft,
    dirty,
    dirtyKeys,
    setLayerSlot,
    setFunKey,
    setActiveProfile,
    setProfileName,
    setHasCustomIcon,
    syncFromSnapshot,
    reset,
  };
}

/** 清空指定层（组合层）的全部槽位为 unbound。 */
function clearLayer(d: KeymapData, layer: number): void {
  const target = d.layers[layer];
  if (!target) return;
  d.layers[layer] = {
    slots: target.slots.map(() => ({ kind: "unbound" }) as KeyAction),
  };
}

function clampFunKey(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const i = Math.trunc(v);
  return i >= 1 && i <= 11 ? i : 0;
}

function clampProfile(p: number): number {
  if (!Number.isFinite(p)) return 0;
  const i = Math.trunc(p);
  if (i < 0) return 0;
  if (i >= 8) return 7;
  return i;
}

function clampString(s: string, maxBytes: number): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  if (bytes.length <= maxBytes) return s;
  let cut = maxBytes;
  const last = bytes[cut - 1];
  const prev = cut >= 2 ? bytes[cut - 2] : 0;
  if (last !== undefined && prev !== undefined) {
    if (last >= 0x80 && last <= 0xbf && prev >= 0xf0 && prev <= 0xf7) {
      cut -= 2;
    } else if (
      last >= 0x80 &&
      last <= 0xbf &&
      (cut < 3 || (bytes[cut - 3] ?? 0) >= 0xe0)
    ) {
      cut -= 1;
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, cut));
}
