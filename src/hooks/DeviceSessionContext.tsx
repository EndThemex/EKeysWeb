/**
 * DeviceSessionContext — 在 ConfigLayout 顶层挂一份 useEKeysDevice()，
 * 让 Settings / Keymap / Lighting / Voice / Log / About 六个 Tab 共享
 * 同一个连接实例，避免每次切 Tab 都重建 Web Serial 连接、丢失心跳和快照。
 *
 * 用法：
 *   <ConfigLayout>           // 在这里 useEKeysDevice() 一次并提供
 *     <Outlet />             // 子页面 useDeviceSession() 取
 *   </ConfigLayout>
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  useEKeysDevice,
  type DeviceError,
  type DeviceSnapshot,
  type Phase,
} from "./useEKeysDevice";

export interface DeviceSession {
  supported: boolean;
  phase: Phase;
  connected: boolean;
  error: DeviceError | null;
  snapshot: DeviceSnapshot;
  connect: () => Promise<DeviceSnapshot>;
  disconnect: () => Promise<void>;
  sendCmd: <T extends import("./useSerial").SerialFrame = import("./useSerial").SerialFrame>(
    cmd: number,
    data?: object,
    timeoutMs?: number,
  ) => Promise<T>;
  onPush: (handler: (frame: import("./useSerial").SerialFrame) => void) => () => void;
  onLogLine: (handler: (line: string) => void) => () => void;
  onError: (handler: (err: DeviceError) => void) => () => void;
}

const DeviceSessionContext = createContext<DeviceSession | null>(null);

export function DeviceSessionProvider({ children }: { children: ReactNode }) {
  const session = useEKeysDevice();
  return (
    <DeviceSessionContext.Provider value={session}>
      {children}
    </DeviceSessionContext.Provider>
  );
}

export function useDeviceSession(): DeviceSession {
  const ctx = useContext(DeviceSessionContext);
  if (!ctx) {
    throw new Error(
      "useDeviceSession must be used inside <DeviceSessionProvider> " +
        "(i.e. inside ConfigLayout).",
    );
  }
  return ctx;
}
