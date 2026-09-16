/**
 * useOtaInfo — OTA Tab 专用的固件信息拉取 hook（M4 占位版本）。
 *
 * 设计要点：
 * - 仅发送 0x0b FIRMWARE_INFO 拉取设备版本 / 构建日期；
 * - 不做真正的 OTA 下载（设计文档 §12.3 的 .bin 直写留给后续迭代）；
 * - 进入 OTA Tab 时自动拉一次，提供手动 refresh；
 * - 0x8b 推送到达时自动更新。
 */

import { useCallback, useEffect, useState } from "react";
import { CMD } from "../protocol";
import type { FirmwareInfo } from "./useEKeysDevice";
import type { SerialFrame } from "./useSerial";

const REQUEST_TIMEOUT_MS = 3000;

export interface UseOtaInfoResult {
  firmwareInfo: FirmwareInfo | null;
  loading: boolean;
  /** null 表示成功 / 未尝试，string 表示错误消息。 */
  error: string | null;
  /** 主动拉一次（点 "刷新"）。 */
  refresh(): Promise<void>;
}

export function useOtaInfo(
  sendCmd: <T extends SerialFrame = SerialFrame>(
    cmd: number,
    data?: object,
    timeoutMs?: number,
  ) => Promise<T>,
  onPush: (handler: (frame: SerialFrame) => void) => () => void,
  connected: boolean,
): UseOtaInfoResult {
  const [firmwareInfo, setFirmwareInfo] = useState<FirmwareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      const frame = await sendCmd<Record<string, unknown>>(
        CMD.FIRMWARE_INFO,
        undefined,
        REQUEST_TIMEOUT_MS,
      );
      const info = extractFirmwareInfo(frame);
      if (info) setFirmwareInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [connected, sendCmd]);

  // 订阅 0x8b 推送
  useEffect(() => {
    if (!connected) return;
    const off = onPush((frame) => {
      if ((frame.cmd as number) === (CMD.FIRMWARE_INFO | 0x80)) {
        const info = extractFirmwareInfo(frame);
        if (info) setFirmwareInfo(info);
      }
    });
    return off;
  }, [connected, onPush]);

  // 进入 OTA Tab 自动拉一次
  useEffect(() => {
    if (!connected) {
      setFirmwareInfo(null);
      setError(null);
      return;
    }
    void refresh();
  }, [connected, refresh]);

  return { firmwareInfo, loading, error, refresh };
}

function extractFirmwareInfo(frame: Record<string, unknown>): FirmwareInfo | null {
  const data = (frame.data as Record<string, unknown> | undefined) ?? null;
  const firmware = (frame.firmware as Record<string, unknown> | undefined) ?? null;
  const src = data ?? firmware;
  if (!src) return null;
  const version = String(
    (src.version as unknown) ??
      (src.firmware_version as unknown) ??
      (src.fw_version as unknown) ??
      "",
  );
  if (!version) return null;
  return {
    version,
    build_date: typeof src.build_date === "string" ? src.build_date : undefined,
    build_time: typeof src.build_time === "string" ? src.build_time : undefined,
  };
}
