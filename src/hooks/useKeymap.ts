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
 * 整表下发语义：固件 KeyNameTable.cpp 当前只解析 layer 0，因此 SET 只覆盖
 * layer 0；其它 layer 暂不同步（设计文档 §10.4）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  diffKeymap,
  emptyKeymapData,
  LAYER_BASE,
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
    // 名称 / 图标 / activeProfile 也算 dirty
    if (snapshot.profileName !== draft.profileName) return true;
    if (snapshot.hasCustomIcon !== draft.hasCustomIcon) return true;
    if (snapshot.activeProfile !== draft.activeProfile) return true;
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
        if (layer !== LAYER_BASE) return prev; // M3 仅允许 layer 0
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
    setActiveProfile,
    setProfileName,
    setHasCustomIcon,
    syncFromSnapshot,
    reset,
  };
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
