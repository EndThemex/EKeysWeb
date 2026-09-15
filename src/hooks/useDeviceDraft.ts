/**
 * useDeviceDraft — DeviceSettings 本地编辑态（草稿）。
 *
 * 与 desktop-app-protocol.md / docs/web-config-design.md §9 一致：
 * - draft 初始拷贝自 snapshot；
 * - patch(p) 合并到 draft，并把对应位置位 dirtyMask；
 * - consume() 返回 diff(draft, snapshot) 结果并清空 dirtyMask；
 * - reset() 从 snapshot 重建 draft；
 * - mergeFromPush(newSnap, oldMask, newMask) 用于在收到 0x87 推送时
 *   保留用户当前正在编辑的字段（oldMask ∩ newMask 不被覆盖）。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  diff,
  mergePush,
  type DeviceSettings,
  type FieldName,
  FieldMask,
  F,
} from "../protocol";

export interface UseDeviceDraftResult {
  draft: DeviceSettings | null;
  dirtyMask: FieldMask;
  /** 是否存在任意字段被修改但未下发。 */
  isDirty: boolean;
  /** 合并 p 到 draft，并把对应位置位。 */
  patch: (p: Partial<DeviceSettings>) => void;
  /** 计算 diff(draft, snapshot) 并清空 dirtyMask。返回 null 表示无变化。 */
  consume: () => { delta: Partial<DeviceSettings>; mask: FieldMask } | null;
  /** 用 snapshot 重建 draft 并清空 dirtyMask。 */
  reset: () => void;
  /** 0x87 推送到达时调用：保留 dirty 字段。 */
  mergeFromPush: (newSnap: DeviceSettings, newMask: FieldMask) => void;
}

export function useDeviceDraft(
  snapshot: DeviceSettings | null,
): UseDeviceDraftResult {
  const [draft, setDraft] = useState<DeviceSettings | null>(snapshot);
  const [dirtyMask, setDirtyMask] = useState<FieldMask>(FieldMask.empty());
  const dirtyRef = useRef<FieldMask>(FieldMask.empty());
  // 缓存 snapshot 引用以便 patch 时比较；不需要在 draft 内监听其变化
  const snapRef = useRef<DeviceSettings | null>(snapshot);

  useEffect(() => {
    snapRef.current = snapshot;
    // snapshot 首次到达 → 用新值作为 draft 基线
    if (snapshot && draft === null) {
      setDraft(snapshot);
      return;
    }
    // snapshot 是同一对象引用（同一连接）→ 跳过；让 patch() / mergeFromPush() 处理变更
  }, [snapshot, draft]);

  const patch = useCallback((p: Partial<DeviceSettings>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p } as DeviceSettings;
      // 比对 prev / next，找出被改动的字段
      const mask = FieldMask.empty();
      const prevRec = prev as unknown as Record<string, unknown>;
      const nextRec = next as unknown as Record<string, unknown>;
      const keys = Object.keys(F) as FieldName[];
      for (const k of keys) {
        const a = prevRec[k];
        const b = nextRec[k];
        if (a !== b) mask.set(F[k]);
      }
      setDirtyMask((m) => {
        const next = m.union(mask);
        dirtyRef.current = next;
        return next;
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const snap = snapRef.current;
    setDraft(snap);
    setDirtyMask(FieldMask.empty());
    dirtyRef.current = FieldMask.empty();
  }, []);

  const consume = useCallback(() => {
    const snap = snapRef.current;
    if (!draft || !snap) return null;
    const { delta, mask } = diff(snap, draft);
    if (mask.isEmpty()) return null;
    // 清空 dirty
    setDirtyMask(FieldMask.empty());
    dirtyRef.current = FieldMask.empty();
    return { delta, mask };
  }, [draft]);

  const mergeFromPush = useCallback(
    (newSnap: DeviceSettings, newMask: FieldMask) => {
      const snap = snapRef.current;
      const d = draft;
      if (!snap || !d) {
        setDraft(newSnap);
        return;
      }
      // mergePush 的语义是「保留 dirty 字段」，所以用 dirtyRef 而不是 dirtyMask
      const merged = mergePush(newSnap, snap, dirtyRef.current, newMask, d);
      // 把 snapshot 引用更新成新的 newSnap
      snapRef.current = newSnap;
      setDraft(merged);
    },
    [draft],
  );

  return {
    draft,
    dirtyMask,
    isDirty: !dirtyMask.isEmpty(),
    patch,
    consume,
    reset,
    mergeFromPush,
  };
}
