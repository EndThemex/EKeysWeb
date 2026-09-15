# EKeysWeb 网页配置实现方案

> 面向 **浏览器端配置面板**（`/config` 路由）的完整设计与实现说明。
> 与 [`EKeysApp` 桌面端](https://github.com/EndThemex/EKeysApp) 协议层（[`docs/protocol-usage.md`](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md)）保持 100% 兼容：
> 同一份 `v1.0` 协议、同一个 `DeviceSettings` 25 字段、同一个 22 条命令集。
>
> 当前仓库已具备的最小骨架：
>
> - [`src/hooks/useSerial.ts`](../src/hooks/useSerial.ts)：Web Serial 接入 + 行解析 + 关闭序列
> - [`src/hooks/useEKeysDevice.ts`](../src/hooks/useEKeysDevice.ts)：seq 自增 + pending 队列 + `connect()` 拉取首屏快照
> - [`src/components/ConfigPanel.tsx`](../src/components/ConfigPanel.tsx)：只读快照展示（Device / Settings / Profile 三卡）
> - [`src/pages/ConfigPage.tsx`](../src/pages/ConfigPage.tsx)：路由挂载
>
> 本文档描述在此骨架之上扩展到 **完整功能版**（READ + WRITE 全 25 字段 + Keymap 编辑 + 音效板 + OTA）的方案。

---

## 0. 目录

1. [目标与边界](#1-目标与边界)
2. [架构总览](#2-架构总览)
3. [Web Serial 适配层](#3-web-serial-适配层)
4. [协议层（TypeScript 端）](#4-协议层typescript-端)
5. [设备会话 Hook（useEKeysDevice）](#5-设备会话hookuseekeysdevice)
6. [UI 路由与页面装配](#6-ui-路由与页面装配)
7. [页面设计（与桌面端 8 个面板一一对应）](#7-页面设计与桌面端-8-个面板一一对应)
8. [敏感字段处理](#8-敏感字段处理)
9. [增量下发与草稿（Draft）模型](#9-增量下发与草稿draft模型)
10. [键映射编辑（Keymap）](#10-键映射编辑keymap)
11. [音效板（Audio Pad）](#11-音效板audio-pad)
12. [OTA 升级](#12-ota-升级)
13. [PC 状态推送（PC Status）](#13-pc-状态推送pc-status)
14. [主动推送（0x87 / 0x10 / 0x0c / 0x0f）订阅](#14-主动推送-0x87--0x10--0x0c--0x0f订阅)
15. [会话日志与错误反馈](#15-会话日志与错误反馈)
16. [i18n 与设计 token 复用](#16-i18n-与设计-token-复用)
17. [安全 / 隐私约束](#17-安全--隐私约束)
18. [浏览器兼容性矩阵](#18-浏览器兼容性矩阵)
19. [测试策略](#19-测试策略)
20. [里程碑与交付物](#20-里程碑与交付物)
21. [附录 A：命令清单与 App 接入现状映射](#21-附录-a命令清单与-app-接入现状映射)
22. [附录 B：与桌面 App 的差异与限制](#22-附录-b与桌面-app-的差异与限制)

---

## 1. 目标与边界

### 1.1 目标

把桌面端 [`EKeysApp`](../EKeysApp/) 的 8 个配置面板（Settings / Keymap / Lighting / WiFi / Audio / Voice / Log / About）搬到浏览器里，让用户**无需安装**就能：

- 通过 Web Serial 连接 EKeys；
- **读取**完整设备快照（设备信息、25 项 `DeviceSettings`、Keymap、Profile 状态、固件版本、音频文件列表）；
- **编辑并下发**全部 25 项配置字段（含 WiFi 凭据、Voice Secret 等敏感字段的脱敏写入）；
- **编辑**键映射（4 层 × 11 键），并下发到当前 Profile；
- **管理音效板**：上传音频文件、绑定 11 个键位、试播、删除；
- **触发 OTA**：经由局域网 HTTP 服务，把 `.bin` 推送到设备；
- **查看实时会话日志**（TX / RX / Firmware / App 四类分色展示）。

### 1.2 不在本期范围

- **PC 状态推送**（`0x0d`）—— 浏览器沙箱无法稳定拿到键盘 Lock / CPU / 内存细节，仅提供预留；
- **HA 状态推送**（`0x12`）—— 等固件实现后再接入；
- **键值上报**（`0x09`）—— 固件侧未实现，不订阅；
- **音乐状态/控制**（`0x0e` / `0x0f`）—— 仅展示订阅到的推送，不主动模拟；
- **后台心跳守护** —— 浏览器没有可靠的后台线程，心跳由会话内定时器驱动；Tab 切到后台时自动让心跳让路（浏览器会自动节流 `setInterval`，避免与设备失同步的处理见 §5.6）。

### 1.3 兼容性边界\*\*：协议层

与 [`EKeysApp/docs/protocol-usage.md`](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md) §0 对齐：

- 协议版本 **v1.0**；
- 任何破坏性变更**先**在协议文档顶部声明，再 bump `PROTOCOL_VERSION`；
- 命令 ID 与字段顺序与桌面端 `protocol.rs` 保持一致；
- 所有 22 条命令常量集中在一个文件（参见 §4.1）。

---

## 2. 架构总览

```
                          ┌─────────────────────────────────────────┐
                          │              UI Layer (React)           │
                          │                                         │
                          │  ConfigPage / KeymapPage / AudioPage …  │
                          │  ┌─────────────┐   ┌─────────────────┐  │
                          │  │ ConfigPanel │   │ KeymapEditor …  │  │
                          │  └──────┬──────┘   └────────┬────────┘  │
                          │         │ useEKeysDevice() │           │
                          │         ▼                  ▼           │
                          │  ┌───────────────────────────────┐      │
                          │  │   Hooks / Context (session)   │      │
                          │  │   - useEKeysDevice (会话)     │      │
                          │  │   - useDeviceDraft  (草稿)    │      │
                          │  │   - useDeviceLog    (日志)    │      │
                          │  │   - usePushSub      (推送)    │      │
                          │  │   - useOtaWorker    (OTA)     │      │
                          │  │   - useAudioUploader(音效)    │      │
                          │  └───────────────┬───────────────┘      │
                          └──────────────────┼──────────────────────┘
                                             │ commands / events
                                             ▼
                          ┌─────────────────────────────────────────┐
                          │           Protocol Layer (TS)           │
                          │  - Frame 编解码 (LF 行)                  │
                          │  - 命令常量 / DeviceSettings 类型       │
                          │  - diff / apply / clamp / mask_sensitive│
                          │  - FieldMask                            │
                          │  - KeyAction ↔ FirmwareKeyEntry 映射    │
                          └─────────────────┬───────────────────────┘
                                            │ Uint8Array
                                            ▼
                          ┌─────────────────────────────────────────┐
                          │           Transport (Web Serial)        │
                          │  - connectEKeysSerial()                 │
                          │  - 行解析 / 日志分流 / close lock 顺序   │
                          └─────────────────┬───────────────────────┘
                                            │ USB CDC (115200)
                                            ▼
                                       [ EKeys 设备 ]
```

### 2.1 模块清单

| 模块                            | 职责                                                   | 不允许         |
| ------------------------------- | ------------------------------------------------------ | -------------- |
| `src/protocol/`                 | 协议层（纯函数）                                       | IO、React、DOM |
| `src/hooks/useSerial.ts`        | Web Serial 连接 + 行解析                               | 业务协议常量   |
| `src/hooks/useEKeysDevice.ts`   | 会话句柄（连接 / disconnect / sendCmd / 推送订阅）     | UI 渲染        |
| `src/hooks/useDeviceDraft.ts`   | 草稿状态 + diff 触发 + merge_push 合并                 | IO             |
| `src/hooks/useDeviceLog.ts`     | TX / RX / Firmware / App 四类日志环形缓冲              | 协议字段       |
| `src/hooks/usePushSub.ts`       | 订阅 `0x87` / `0x10` / `0x0c` / `0x0f` 推送            | UI             |
| `src/hooks/useOtaWorker.ts`     | 一次性局域网 HTTP 服务 + MD5 + 触发 `0x0b`             | UI             |
| `src/hooks/useAudioUploader.ts` | `0x16` 分块上传 / 删除 / 列表                          | UI             |
| `src/pages/ConfigPage.tsx`      | 路由挂载                                               | 业务           |
| `src/components/ConfigPanel/`   | 拆分：Header / Status / Cards（设备 / 设置 / Profile） | 直连 serial    |
| `src/components/KeymapEditor/`  | 键映射编辑器（4 层 × 11 键）                           | 直连 serial    |
| `src/components/AudioPadPanel/` | 音效板：上传 / 绑定 / 试播                             | 直连 serial    |
| `src/components/OtaPanel/`      | OTA 面板                                               | 直连 serial    |
| `src/components/DeviceLog.tsx`  | 会话日志                                               | 直连 serial    |

### 2.2 跨层约定

1. **UI 不直接读 raw frame** —— 所有帧进入 `useEKeysDevice`，由它把已解析 payload 投递给订阅者（`onPush`、`onLog`、`onResponse`）。
2. **协议层零 IO** —— `Frame.encode/decode`、`DeviceSettings.clamp/diff/apply`、`KeyAction.toFirmwareStrings` 等都是纯函数，便于单测。
3. **错误统一收口** —— Web Serial 抛错 → `useSerial` → `useEKeysDevice` 统一 `classify(err)` 成 `DeviceError`，UI 用 i18n key 渲染（与当前 `ConfigPanel` 中 `ErrorBanner` 复用）。
4. **敏感字段统一脱敏** —— `maskSensitive()` 在所有"设备 → App"方向必经点（`0x87` 推送、`0x07` 响应、自动拉取）调用一次（详见 §8）。

---

## 3. Web Serial 适配层

### 3.1 现状

[`useSerial.ts`](../../src/hooks/useSerial.ts) 已完成以下能力：

- `isWebSerialSupported()` 检测 `navigator.serial`；
- `connectEKeysSerial()` 用 `usbVendorId: 0x303a`（Espressif）筛选设备；
- `port.open({ baudRate: 115200 })`；
- 异步读取循环按 `\n` 切帧，过滤日志（仅 `trimmed.startsWith("{")` 进入 JSON 解析）；
- `close()` 严格按 `readable.cancel → writable.abort → releaseLock → readLoop → port.close` 顺序释放。

### 3.2 本期补强

| 能力                    | 改造点                                                                                                        | 备注                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **DTR/RTS 控制**        | `port.open({ baudRate: 115200, bufferSize: 4096 })`                                                           | TinyUSB CDC 默认即可工作；若用户反馈"插上无反应"，再补 `port.setSignals({ dataTerminalReady: true, requestToSend: true })` |
| **背压 / 高频日志保护** | 读取循环里增加 `await writer.ready` 之前先 `await new Promise(r => setTimeout(r, 0))` 让帧处理让步            | 防止 UI 卡死                                                                                                               |
| **日志旁路**            | 在读取循环里把"非 JSON 行"通过回调 `onLogLine(line)` 上抛                                                     | `useDeviceLog` 订阅                                                                                                        |
| **错误归一**            | `connectEKeysSerial` 把所有 Web Serial 异常包成 `DeviceError`                                                 | 复用 `useEKeysDevice.classify()`                                                                                           |
| **重连探测**            | 读取循环退出（reader done / 异常）时，emit `onDisconnected(reason)`，让 `useEKeysDevice` 把 phase 切回 `idle` | 当前 disconnect 只能用户手动触发                                                                                           |
| **多订阅者**            | `callbacks: FrameCallback[]` 已有，但日志和帧走不同通道，扩展为 `{ onFrame, onLogLine, onError }`             | 见 §3.3                                                                                                                    |

### 3.3 接口改造

```ts
// src/hooks/useSerial.ts
export type FrameCallback = (frame: SerialFrame) => void;
export type LogLineCallback = (line: string) => void;
export type ErrorCallback = (err: DeviceError) => void;

export interface EKeysSerial {
  /** 写入一行 JSON 协议帧（自动追加 `\n`）。 */
  write: (line: string) => Promise<void>;
  /** 订阅解析出的协议帧。 */
  onFrame: (cb: FrameCallback) => () => void;
  /** 订阅串口日志行（非 JSON 行）。 */
  onLogLine: (cb: LogLineCallback) => () => void;
  /** 订阅底层错误（reader 异常 / port 关闭事件）。 */
  onError: (cb: ErrorCallback) => () => void;
  /** 彻底关闭串口；幂等。 */
  close: () => Promise<void>;
  readonly closed: boolean;
}
```

读取循环失败时（如 USB 拔出、`port.readable` 抛错）通过 `onError` 上抛 `{ kind: "deviceLost", message }`，`useEKeysDevice` 据此把 `phase` 切到 `idle` 并清空 `pending`。

---

## 4. 协议层（TypeScript 端）

把 Rust 端 [`protocol.rs`](../../EKeysApp/src/protocol.rs) 的纯函数部分用 TypeScript 重新实现，**形态完全对齐**：

### 4.1 文件布局

```
src/protocol/
├── index.ts          # 重导出 + 版本号 PROTOCOL_VERSION = 1
├── frame.ts          # Frame 编解码 / isResponse / isPush / status / parseLine
├── commands.ts       # 22 条 CMD_* 常量 + responseCmd / isResponse / isResponseLike / isTopLevelCmd
├── mask.ts           # FieldMask（BigInt 位运算，>25 字段也能容纳）
├── settings.ts       # DeviceSettings 类型 + clamp() + diff() + apply() + mergePush() + maskSensitive()
├── keymap.ts         # KeymapData 类型 + toFirmwareEntries() + applyFirmwareEntries() + KeyAction ↔ 固件编码
├── audio.ts          # AudioFileInfo / AudioPadBinding / op 常量 / 白名单校验
├── ota.ts            # FirmwareInfo / FirmwareOtaReq 类型 + MD5 计算工具（Web Crypto）
├── voice.ts          # VoiceTextPush / PcStatusReq / MusicStatusReq / MusicControl
├── time.ts           # TimeSetReq 构造（epoch + tz，tz 取 -new Date().getTimezoneOffset()/60）
└── __tests__/        # vitest 单测
```

### 4.2 `Frame`（`src/protocol/frame.ts`）

```ts
export interface Frame {
  cmd: number; // u8
  seq: number; // u32
  data?: unknown; // 请求/响应体；可缺省
  status?: number; // 仅响应帧携带；0 = 成功，1 = 失败
  error?: string; // status = 1 时附带
  /** 顶层未声明字段（如 0x05 响应的 keymap 数组）。 */
  extra?: Record<string, unknown>;
}

export function encodeLine(frame: Frame): string; // 末尾追加 '\n'
export function tryParseLine(line: string): Frame | null; // 非 JSON 行返回 null
export const isResponse = (cmd: number) => (cmd & 0x80) !== 0;
export const isResponseLike = (cmd: number) =>
  isResponse(cmd) || cmd === CMD.PROFILE_STATE;
export const isPush = (f: Frame) => isResponse(f.cmd) && f.seq === 0;
export const isTopLevelCmd = (cmd: number) =>
  cmd === CMD.PROFILE_STATE ||
  cmd === CMD.VOICE_TEXT ||
  cmd === CMD.MUSIC_CONTROL;
```

### 4.3 `DeviceSettings`（`src/protocol/settings.ts`）

完整 25 字段（顺序、类型、默认值与 Rust 端一一对应）：

```ts
export interface DeviceSettings {
  wifi_switch: number; // 0/1
  connect_host: number; // 0/1
  wifi_ssid: string;
  wifi_password: string; // 敏感
  work_mode: number; // 0=USB 1=BLE 2=2.4G
  rgb_mode: number; // 0..9
  rgb_single_color: number; // 0..23
  rgb_click_mode: number; // 0..2
  rgb_brightness: number; // 0..100
  tft_theme: number;
  tft_brightness: number; // 5..100
  device_volume: number;
  audio_enable: number; // 0/1
  power_mode: number;
  voice_enable: number; // 0/1
  voice_trigger_key: number; // 0..11
  voice_max_record_ms: number; // 1000..60000
  voice_auto_enter: number; // 0/1
  voice_cuid: string; // 32B
  voice_tencent_secret_id: string; // 敏感，64B
  voice_tencent_secret_key: string; // 敏感，64B
  pc_status_mask: number;
  active_keymap_profile: number; // 0..7
  active_profile_name: string;
  active_profile_has_custom_icon: boolean;
}
```

`clamp()` 规则与 Rust 端 `DeviceSettings::clamp()` 1:1（见 `protocol.rs:374` 起）：

- `tft_brightness ∈ [5, 100]`；
- `rgb_mode ∈ [0, 9]`、`rgb_single_color ∈ [0, 23]`、`rgb_click_mode ∈ [0, 2]`、`rgb_brightness ∈ [0, 100]`；
- `work_mode ∈ {0, 1, 2}`，越界回退 0；
- `active_keymap_profile ∈ [0, 7]`，越界回退 0；
- `wifi_switch` / `connect_host` / `voice_enable` / `voice_auto_enter` 归一化为 0/1；
- `voice_trigger_key ∈ [0, 11]`；
- `voice_max_record_ms ∈ [1000, 60000]`；
- 字符串按字节截断（不切断 UTF-8 字符边界），长度上限：`wifi_ssid` / `voice_cuid` 32B，`wifi_password` / 腾讯云双密钥 64B。

> 测试要求：用 vitest 把 §4.3 全部规则写成 case，外加 `"work_mode = 0"` / `"wifi_ssid = """` 不被误判为"无变化"的回归（用 mask 显式标记）。

### 4.4 `FieldMask`（`src/protocol/mask.ts`）

```ts
export class FieldMask {
  private bits: bigint;
  static empty(): FieldMask;
  static all(): FieldMask; // 低 FIELD_COUNT 位全 1
  static fromBits(b: bigint): FieldMask;
  set(bit: number): FieldMask;
  test(bit: number): boolean;
  intersect(other: FieldMask): FieldMask;
  union(other: FieldMask): FieldMask;
  toJSON(): string; // 大端十六进制字符串，便于日志
}
```

> 选择 `bigint` 是为了未来字段 > 25 时无需重构（与 Rust `u64` 等价）。

### 4.5 `diff` / `apply` / `mergePush` / `maskSensitive`

与 Rust 端同名方法语义一致（对齐 `protocol.rs:459` 起）：

```ts
export function diff(
  a: DeviceSettings,
  b: DeviceSettings,
): { delta: DeviceSettings; mask: FieldMask };

export function apply(
  target: DeviceSettings,
  delta: DeviceSettings,
  mask: FieldMask,
): DeviceSettings; // 不可变返回新对象

export function mergePush(
  newSnap: DeviceSettings,
  oldSnap: DeviceSettings,
  oldMask: FieldMask,
  newMask: FieldMask,
  draft: DeviceSettings,
): DeviceSettings;

export function maskSensitive(s: DeviceSettings): DeviceSettings;
// 返回新对象；wifi_password / voice_tencent_secret_id / voice_tencent_secret_key 替换为 "***"
```

### 4.6 `KeyAction ↔ FirmwareKeyEntry` 映射（`src/protocol/keymap.ts`）

完整复用 [`protocol-usage.md` §9.3](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md) 的映射规则：

- **映射基准**：active profile 的 layer 0（Base），跳过旋钮槽（`row 0, col 3`，即第一行第四个位置）；
- **物理布局**：3 行 × 4 列，`(row=0, col=3)` 为旋钮（不可绑定，仅展示），其余 11 个位置为可绑定按键；
- **编号**：按 `(row, col)` 升序跳过旋钮槽 → `physical = 1..11`（即 `(0,0)=1 … (0,2)=3 → (1,0)=4 … (1,3)=7 → (2,0)=8 … (2,3)=11`）；
- **编码**：`Keyboard(code)` → `normal = "0xNN"`（固件 `KeyNameTable` 可还原）；`Media / Mouse / Macro / LayerSwitch / Encoder` → 尽力编码为 `function`；
- **回读限制**：固件 `macro` 是 `+` 序列，App 的 `Macro` 是带延时步进模型，**无法无损还原** → 回读为"未绑定"，UI 必须提示用户重新编辑。

### 4.7 命令常量（`src/protocol/commands.ts`）

完整 22 条常量（与 [`protocol.rs:122` 起](../../EKeysApp/src/protocol.rs) 对齐）：

```ts
export const CMD = {
  CONF_VERSION_GET: 0x01,
  CONF_VERSION_SET: 0x02,
  DEVICE_INFO_GET: 0x03,
  DEVICE_INFO_SET: 0x04,
  KEYMAP_GET: 0x05,
  KEYMAP_SET: 0x06,
  CONFIG_GET: 0x07,
  CONFIG_SET: 0x08,
  KEY_EVENT: 0x09,
  HEARTBEAT: 0x0a,
  FIRMWARE_INFO: 0x0b,
  VOICE_TEXT: 0x0c,
  PC_STATUS: 0x0d,
  MUSIC_STATUS: 0x0e,
  MUSIC_CONTROL: 0x0f,
  PROFILE_STATE: 0x10,
  PROFILE_ICON_SET: 0x11,
  HA_STATUS: 0x12,
  TIME_SET: 0x13,
  FIRMWARE_DOWNLOAD: 0x14,
  PROFILE_NAME_SET: 0x15,
  AUDIO_FILE: 0x16,
  AUDIO_PAD: 0x17,
} as const;

export const responseCmd = (req: number) => req | 0x80;
```

---

## 5. 设备会话 Hook（useEKeysDevice）

### 5.1 现状

[`useEKeysDevice.ts`](../../src/hooks/useEKeysDevice.ts) 已实现：

- `phase` 状态机：`idle → connecting → connected → disconnecting → idle`；
- `seq` 自增 + `pending` Map 配对响应；
- `connect()` 拉取 `0x01 / 0x03 / 0x07 / 0x10` 首屏快照；
- `0x10` 例外路由（cmd 仍是 `0x10`、`profile_state` 在顶层）；
- `classify()` 把 Web Serial 抛错归一为 `DeviceError`。

### 5.2 本期扩展

| 能力                  | 改造点                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **sendCmd 通用化**    | 当前仅暴露 `connect()`，提取 `sendCmd(cmd, data?)` 私有 API 给上层 hook 使用                                   |
| **推送订阅**          | 增加 `onPush(handler)`：收到 `isPush(frame)` 帧（`0x87` / `0x10` / `0x0c` / `0x0f`）时回调                     |
| **日志订阅**          | 增加 `onLogLine(handler)`：转发现 `useSerial.onLogLine`                                                        |
| **错误订阅**          | 增加 `onError(handler)`：转发现 `useSerial.onError`（reader 异常 → phase = idle）                              |
| **心跳**              | `phase === 'connected'` 时启动 `setInterval(() => sendCmd(CMD.HEARTBEAT), 5000)`；3 次超时把 phase 切回 `idle` |
| **TIME_SET**          | 进入 `connected` 立即发 `0x13`（epoch + tz），与桌面端一致                                                     |
| **批量 sendCmd 队列** | 多个 hook 同时调用时串行化，避免 `0x11` / `0x15` 等需要有序的命令错位                                          |
| **Pending 超时分类**  | 把 `timeout` 拆成 `timeoutRequest`（请求未响应）与 `timeoutHeartbeat`（心跳丢失）                              |

### 5.3 接口（最终形态）

```ts
export function useEKeysDevice() {
  return {
    supported: boolean;
    phase: Phase;
    connected: boolean;
    error: DeviceError | null;

    connect(): Promise<DeviceSnapshot>;
    disconnect(): Promise<void>;

    // 通用发送（内部串行队列）
    sendCmd<T = SerialFrame>(cmd: number, data?: object): Promise<T>;

    // 订阅
    onPush(handler: (frame: SerialFrame) => void): () => void;
    onLogLine(handler: (line: string) => void): () => void;
    onError(handler: (err: DeviceError) => void): () => void;
  };
}
```

### 5.4 会话快照 `DeviceSnapshot`

```ts
export interface DeviceSnapshot {
  version: number | null; // 0x01 配置版本
  info: DeviceInfo | null; // 0x03 设备信息
  config: DeviceConfig | null; // 0x07 配置（已脱敏）
  profile: ProfileState | null; // 0x10 Profile
}
```

### 5.5 心跳 / 重连策略

- **心跳周期 5s**，超时 3 次（15s）切回 `idle` 并触发 `onError({ kind: "heartbeatLost" })`；
- Tab 切到后台时浏览器会节流 `setInterval`，因此**不可靠**；补一个 `visibilitychange` 监听：切回前台立即补一发心跳；
- `disconnect()` 期间不允许新 `sendCmd`，全部走 `classify(new Error("disconnecting"), "portBusy")`。

### 5.6 与桌面端 `link/` 子系统的对应

| 桌面端                           | Web 端                                  |
| -------------------------------- | --------------------------------------- |
| `link::reader`（后台线程）       | `useSerial` 的 `readLoop` Promise       |
| `link::writer`（单写者 channel） | `useEKeysDevice` 内部串行 Promise 队列  |
| `link::heartbeat`（独立线程）    | `setInterval` + `visibilitychange` 监听 |
| `LinkManager` 状态机             | `phase` state                           |
| `AppHandle` 跨线程共享           | React Context（`DeviceSessionContext`） |

---

## 6. UI 路由与页面装配

### 6.1 路由扩展

`src/App.tsx` 当前路由：

```tsx
<Route path="/" element={<HomePage />} />
<Route path="/features" element={<FeaturesPage />} />
<Route path="/specs" element={<SpecsPage />} />
<Route path="/docs" element={<DocsPage />} />
<Route path="/app" element={<AppPage />} />
<Route path="/config" element={<ConfigPage />} />
```

扩展为带二级 Tab 的配置区：

```tsx
<Route path="/config" element={<ConfigLayout />}>
  <Route index element={<SettingsTab />} /> {/* 默认：设备设置（READ+WRITE） */}
  <Route path="keymap" element={<KeymapTab />} />
  <Route path="lighting" element={<LightingTab />} />
  <Route path="wifi" element={<WifiTab />} />
  <Route path="audio" element={<AudioTab />} />
  <Route path="voice" element={<VoiceTab />} />
  <Route path="ota" element={<OtaTab />} />
  <Route path="log" element={<LogTab />} />
  <Route path="about" element={<AboutTab />} />
</Route>
```

### 6.2 `ConfigLayout` 职责

- 顶部 chrome：复用 [`SiteHeader`](../../src/components/SiteHeader.tsx) 的导航 + 当前 Tab 高亮；
- 全局 **连接状态胶囊**（`StatusPill`，与当前 `ConfigPanel.StatusPill` 复用）：始终展示 `phase`，未连接时禁用 Tab 内容并提示「请先在「设备」页连接」；
- `Outlet` 渲染当前 Tab；
- 跨 Tab 共享 `DeviceSessionContext`（`useEKeysDevice` 的实例 + 快照缓存 + 草稿）。

### 6.3 `DeviceSessionContext`

```tsx
interface DeviceSessionValue {
  // 来自 useEKeysDevice
  supported: boolean;
  phase: Phase;
  connected: boolean;
  error: DeviceError | null;
  snapshot: DeviceSnapshot | null;

  connect(): Promise<DeviceSnapshot>;
  disconnect(): Promise<void>;
  sendCmd<T = SerialFrame>(cmd: number, data?: object): Promise<T>;
  onPush(handler): () => void;
  onLogLine(handler): () => void;
  onError(handler): () => void;

  // 推送驱动的增量快照（见 §14）
  latestPush: { cmd: number; frame: SerialFrame } | null;
}
```

把 `useEKeysDevice` 的实例放在 `ConfigLayout` 顶层，所有 Tab 通过 `useDeviceSession()` 消费，避免每页都重建 hook。

---

## 7. 页面设计与桌面端 8 个面板一一对应

每个 Tab 的字段集与 `DeviceSettings` 25 字段的映射如下。**所有"写"操作都走 §9 的草稿模型**，按下"应用"才下发。

### 7.1 Settings Tab（默认）— `panel_settings` 对应

**分卡**（复用桌面端 `panel_settings.rs` 的卡片结构）：

| 卡片                  | 字段                             | 控件                                                  |
| --------------------- | -------------------------------- | ----------------------------------------------------- |
| 连接                  | `work_mode`                      | `<select>`：USB / BLE / 2.4G                          |
| 连接                  | `connect_host`                   | `<Switch>`                                            |
| Wi-Fi 总开关          | `wifi_switch`                    | `<Switch>`（展开后显示 SSID 输入）                    |
| Wi-Fi 详情            | `wifi_ssid` / `wifi_password`    | `<Input>`（密码带 `type="password"` + 显示/隐藏按钮） |
| 显示                  | `tft_brightness`                 | `<Slider 5..100>`                                     |
| 显示                  | `tft_theme`                      | 主题选择器（暗/亮 + 自定义）                          |
| 音频                  | `device_volume` / `audio_enable` | `<Slider 0..100>` + `<Switch>`                        |
| 电源                  | `power_mode`                     | `<Select>`：performance / balanced / low-power        |
| Profile               | `active_keymap_profile` (0..7)   | `<Select>` 8 个槽                                     |
| Profile               | `active_profile_name`            | `<Input>`（≤32B）                                     |
| Profile               | `active_profile_has_custom_icon` | 标志位 + 「上传 / 清除」按钮（触发 `0x11`）           |
| PC 状态               | `pc_status_mask`                 | 多选 checkbox（位掩码）                               |
| 应用待下发 / 放弃修改 | —                                | 底部固定按钮组，与桌面端 `DiffPreviewBar` 对应        |

### 7.2 Keymap Tab — `panel_keymap` 对应

详见 §10。

### 7.3 Lighting Tab — `panel_lighting` 对应

| 控件                    | 字段                     |
| ----------------------- | ------------------------ |
| 模式 `<Select>`         | `rgb_mode`（0..9）       |
| 单色选择（24 色调色板） | `rgb_single_color`       |
| 点击模式 `<Select>`     | `rgb_click_mode`（0..2） |
| 亮度 `<Slider>`         | `rgb_brightness`         |

### 7.4 WiFi Tab — `panel_wifi` 对应

合并到 Settings Tab 的 Wi-Fi 卡片即可；如需独立页可保留，**只读**当前 SSID + 「扫描建议」按钮（预留）。

### 7.5 Audio Tab — `panel_audio` 对应

详见 §11。

### 7.6 Voice Tab — `panel_voice` 对应

| 控件           | 字段                       | 说明                            |
| -------------- | -------------------------- | ------------------------------- |
| 启用语音       | `voice_enable`             | `<Switch>`                      |
| 触发键         | `voice_trigger_key`        | `<Select>` 0..11（"未指定"=0）  |
| 最大录音时长   | `voice_max_record_ms`      | `<NumberInput 1000..60000>`     |
| 按下键自动进入 | `voice_auto_enter`         | `<Switch>`                      |
| CUID           | `voice_cuid`               | `<Input>`（≤32B）               |
| Secret ID      | `voice_tencent_secret_id`  | 敏感（`type="password"`）       |
| Secret Key     | `voice_tencent_secret_key` | 敏感（`type="password"`）       |
| 识别结果       | —                          | 订阅 `0x0c` 推送，最近 N 条展示 |

### 7.7 OTA Tab — `panel_settings` 固件升级 + `ota.rs` 对应

详见 §12。

### 7.8 Log Tab — `panel_log` 对应

详见 §15。

### 7.9 About Tab — `panel_about` 对应

只读信息卡：

- 设备信息（`0x03` 响应）：设备名、序列号、固件版本；
- 协议版本（`0x01` 响应）：与本端 `PROTOCOL_VERSION` 比对，**不一致时显示警告 banner**；
- 固件信息（`0x0b` 响应）：版本号、构建日期/时间；
- 连接统计：累计 TX/RX 帧数、心跳成功率（来自 `useDeviceLog`）。

---

## 8. 敏感字段处理

完整复用桌面端 [`protocol-usage.md` §7](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md) 的约定：

- **写入方向**：用户在 UI 输入新值 → 走 `diff()` 正常下发，**不会**被 mask 拦截；
- **接收方向**：所有"设备 → App"必经点（`0x87` 推送、`0x07` GET 响应、推送缓存、自动拉取）调用 `maskSensitive()`，把 `wifi_password` / `voice_tencent_secret_id` / `voice_tencent_secret_key` 替换为 `***`；
- **持久化**：Web 端**不持久化任何**设备快照（仅 `localStorage` 存语言 / 主题，与桌面端一致）；刷新页面后用户必须重新连接并 SET 一次敏感字段（与桌面端行为一致）；
- **剪贴板**：复制按钮复制时直接复制用户当前输入值，不复制 `***`。

实现位置（新增）：

```ts
// src/protocol/settings.ts
export function maskSensitive(s: DeviceSettings): DeviceSettings {
  return {
    ...s,
    wifi_password: "***",
    voice_tencent_secret_id: "***",
    voice_tencent_secret_key: "***",
  };
}

// src/hooks/useEKeysDevice.ts
// 进入 connected 时 / 每次 handleFrame 是 push / 手动 refreshConfig 时调用
function onFullSnapshot(frame: SerialFrame) {
  const raw = frame.data as DeviceSettings;
  snapshot.config = maskSensitive(raw); // 永远不存明文
}
```

---

## 9. 增量下发与草稿（Draft）模型

完整复用 [`protocol-usage.md` §4](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md) 与 Rust 端 `DeviceSettings::diff/apply/merge_push` 的语义。

### 9.1 数据流

```
        ┌────────────────┐   user input    ┌────────────────┐
        │ snapshot (设备) │ ───────────────▶ │   draft        │
        └────────────────┘                  │ (本地编辑态)   │
                                            └───────┬────────┘
                                                    │ 「应用」
                                                    ▼
                                        diff(draft, snapshot)
                                                    │
                                                    ▼
                                   ConfigSetPayload { config: delta }
                                                    │
                                                    ▼
                                          sendCmd(0x08, payload)
                                                    │
                          device ack (0x88)          │
                                                    ▼
                                          apply(snapshot, delta, mask)
                                                    │
                                                    ▼
                                          snapshot ← updated
```

### 9.2 `useDeviceDraft` Hook

```ts
export function useDeviceDraft(initial: DeviceSettings | null) {
  const [draft, setDraft] = useState<DeviceSettings | null>(initial);
  const [dirtyMask, setDirtyMask] = useState<FieldMask>(FieldMask.empty());

  // 用户编辑：合并到 draft，并 set 对应 bit
  function patch(p: Partial<DeviceSettings>) {
    /* ... */
  }

  // 「应用」：返回 diff + mask 给调用方
  function consume(): { delta: DeviceSettings; mask: FieldMask } | null {
    /* ... */
  }

  // 「放弃」：从 snapshot 重建 draft
  function reset() {
    /* ... */
  }

  // 推送合并：mergePush(newSnap, oldSnap, oldMask, newMask, draft)
  function mergeFromPush(newSnap, oldMask, newMask) {
    /* ... */
  }

  return { draft, dirtyMask, patch, consume, reset, mergeFromPush };
}
```

### 9.3 协议层约定

`sendCmd(CMD.CONFIG_SET, payload)`：

```ts
const payload = {
  data: {
    config: delta, // 仅 dirtyMask 标记的字段
  },
};
```

> 与桌面端一致：**不发送 `mask` 字段**，固件按"字段是否存在"判断增量。

### 9.4 应用按钮 / 放弃按钮

复用桌面端 `widgets::DiffPreviewBar`：

- 「应用」按钮显示「将下发 N 项」；
- 「放弃」按钮还原 draft；
- `dirtyMask.isEmpty()` 时两个按钮全部 disabled。

---

## 10. 键映射编辑（Keymap）

### 10.1 组件结构

```
src/components/KeymapEditor/
├── KeymapEditor.tsx        # 顶层：进入页面 GET + 当前 layer 选择 + 保存 / 放弃
├── KeyGrid.tsx             # 12 槽矩阵（3 行 × 4 列），第一行第四列固定为旋钮（不可绑定），其余 11 个为可绑定按键
├── KeyBindingPicker.tsx    # 弹窗：键盘 / 鼠标 / 多媒体 / 宏 / 层切换
├── LayerSelector.tsx       # 4 层选择（Base / Fn / Shift / 自定义）
└── ProfileSwitcher.tsx     # 与 Settings Tab 的 active_keymap_profile 联动
```

### 10.2 数据模型

```ts
export interface KeymapData {
  profiles: number; // 1..8
  activeProfile: number; // 0..7
  layers: LayerBinding[]; // 长度 = profiles * 4
}

export interface LayerBinding {
  // 12 个物理槽：3 行 × 4 列，其中 (row=0, col=3) 为旋钮（不参与绑定、显示为只读），
  // 其余 11 个槽按 (row, col) 升序对应 physical = 1..11
  slots: KeyAction[];
}

export type KeyAction =
  | { kind: "unbound" }
  | { kind: "keyboard"; code: number }
  | { kind: "media"; code: number }
  | { kind: "mouse"; button: number; clicks?: number }
  | { kind: "macro"; steps: { action: KeyAction; delayMs?: number }[] }
  | { kind: "layer-switch"; target: number; mode: "momentary" | "toggle" }
  | { kind: "encoder"; dir: "cw" | "ccw"; action: KeyAction }; // 映射时跳过
```

### 10.3 加载 / 保存流程

```
进入 Keymap Tab
  → sendCmd(0x05)                              // 拉取当前 Profile
  → 应用 FirmwareKeyEntry → KeymapData (applyFirmwareEntries)
  → 编辑：本地 KeymapData 操作
  → 「保存」：
       KeymapData.toFirmwareEntries()
       → sendCmd(0x06, { keymap: entries })
       → 设备 ack → sendCmd(0x10) refresh active profile
       → sendCmd(0x07) refresh 设备 Settings.active_keymap_profile
```

### 10.4 模型限制

与桌面端一致的限制（详见 [`protocol-usage.md` §9.3](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md)）：

- **回读为 unbound**：固件 macro 是 `+` 序列，与 App 的步进宏模型不对等；UI 必须显式提示「固件无法还原该字段，已重置为未绑定」；
- **Media / Mouse / LayerSwitch / Encoder 仅尽力编码**为 `function`，固件当前 `KeyNameTable.cpp` 只解析 a-z/0-9/Enter/Backspace/Space + `0xNN`；如需固件侧支持这些动作，需固件端扩展 `KeyNameTable`（参考 §11 兼容性矩阵）；
- **FUN 组合键**：桌面端 `KeymapData` 支持，应用 `KeyAction::toFirmwareStrings()` 时作为复合编码处理。

---

## 11. 音效板（Audio Pad）

完整复用桌面端 [`protocol-usage.md` §9.5](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md) 的语义。

### 11.1 文件管理（`0x16`）

| op       | App 端                                              | 浏览器侧实现要点                       |
| -------- | --------------------------------------------------- | -------------------------------------- |
| `list`   | 拉取 `{files, total_bytes, used_bytes, free_bytes}` | 进入 Audio Tab 自动调一次              |
| `begin`  | `{name, size}` → `{received: 0, free_bytes}`        | `useAudioUploader` 入口                |
| `data`   | `{name, index, b64}` → `{received: N}`              | 1024B 一块，逐块等响应再发下一块       |
| `end`    | `{name, size}` → 大小校验 → `{free_bytes}`          | 收尾，刷新列表                         |
| `abort`  | `{name}` → 删 `.part`                               | 任一步失败 / 用户取消 / 浏览器关闭触发 |
| `delete` | `{name}` → `{pads, free_bytes}`                     | 弹确认框后调用                         |

**前端约束**：

- 文件名白名单 `^[a-z0-9_]{1,20}\.(mp3|wav)$`：用 `sanitize()` 从原始文件名派生；
- 单文件 ≤ 2 MB：上传前校验；
- 上传期间禁用页面 `beforeunload` 关闭确认；
- Base64 用 `btoa(String.fromCharCode(...))` 分块编码（避免大字符串一次性占用堆）；
- 每块 1024B → Base64 1368 字符 < 固件 `kMaxB64Len = 1400`。

### 11.2 绑定与播放（`0x17`）

| op     | App 端                                            |
| ------ | ------------------------------------------------- |
| `get`  | 拉取 11 键当前绑定                                |
| `set`  | `{key, file}` → 先 ACK 再落盘；`file=""` 表示解绑 |
| `play` | `{key}` 或 `{file}`（试播）                       |
| `stop` | `{}`                                              |

### 11.3 `useAudioUploader` Hook

```ts
export function useAudioUploader() {
  return {
    files: AudioFileInfo[];       // 来自 list
    pads: AudioPadBinding[];      // 来自 0x17 get
    usage: { used: number; free: number };

    upload(file: File): Promise<void>;
    cancel(): Promise<void>;      // 触发 abort
    delete(name: string): Promise<void>;

    bind(key: number, file: string): Promise<void>;
    unbind(key: number): Promise<void>;
    play(key: number): Promise<void>;
    playByFile(name: string): Promise<void>;   // 试播
    stop(): Promise<void>;

    // 进度（只对当前上传）
    progress: { name: string; sent: number; total: number } | null;
  };
}
```

进度写 React state，UI 用现有 `assets/css/...` token 渲染进度条。

---

## 12. OTA 升级

完整复用桌面端 [`docs/ota.md`](https://github.com/EndThemex/EKeysApp/blob/main/docs/ota.md) 的链路。

### 12.1 浏览器侧限制

浏览器**不能**像桌面端那样监听任意端口做一次性 HTTP 服务；但可以：

- **方案 A**：让用户把 `.bin` 通过 Web Serial 直接发到设备（仅适合已启用 ROM USB-Serial-JTAG 下载模式的设备）；
- **方案 B（推荐）**：浏览器发起 mDNS / 局域网请求到 EKeys 暴露的端点；
- **方案 C**：桌面端用 Web 启动 OTA（需要用户已连接过设备），桌面端承担局域网 HTTP。

本期落地 **方案 A（推荐）**：

### 12.2 流程

```
用户在 OTA Tab：
  1. 选择 .bin 文件
  2. Web Crypto API 计算 MD5（SubtleCrypto.digest("MD5", …)）
  3. sendCmd(0x0b, { url, checksum })              // FirmwareOtaReq
     - url：本机占位（http://<local-ip>:30000/...）—— 仅供固件拉取；
     - 若固件侧无 HTTP 客户端，则跳过此步；
  4. sendCmd(0x14)                                 // CMD_FIRMWARE_DOWNLOAD 让设备复位进下载模式
  5. 浏览器等待串口断开 → 通过 Web Serial 把 .bin 直接写入设备（USB-Serial-JTAG）
```

### 12.3 `useOtaWorker` Hook

```ts
export function useOtaWorker() {
  return {
    selectFile(): Promise<File | null>;
    md5: string | null;
    uploadProgress: { sent: number; total: number } | null;
    start(): Promise<void>;          // 串口写 .bin
    cancel(): Promise<void>;
    firmwareInfo: FirmwareInfo | null;  // 来自 0x0b
  };
}
```

### 12.4 后续增强

- 等浏览器支持 `Direct Sockets` 或 `WebTransport` 后，可让浏览器直接拨号局域网端点（替代桌面端 OTA HTTP 服务）；
- 与桌面端保持 `docs/ota.md` 的命令时序与错误反馈一致。

---

## 13. PC 状态推送（PC Status）

### 13.1 浏览器限制

- 浏览器沙箱不能拿键盘 Lock、网络状态细节；
- `navigator.deviceMemory`、`navigator.hardwareConcurrency` 可作为 CPU / 内存近似值；
- `navigator.connection`（如果可用）给出下行带宽与 RTT；
- 在线状态可用 `navigator.onLine`。

### 13.2 本期实现

```ts
function collectPcStatus(): PcStatus {
  return {
    online: navigator.onLine ? 1 : 0,
    cpu_cores: navigator.hardwareConcurrency ?? 0,
    mem_gb: (navigator as any).deviceMemory ?? 0,
    downlink_mbps: (navigator as any).connection?.downlink ?? 0,
    rtt_ms: (navigator as any).connection?.rtt ?? 0,
  };
}
```

提供开关按钮（Settings Tab 的 PC 状态卡片）。开启后每 1 秒调用 `diff` + `sendCmd(0x0d, { pc_status: delta })`。

> 与桌面端 [`pc_status.rs`](../../EKeysApp/src/pc_status.rs) 不等价，但**协议层字段兼容**（`PcStatusReq`）；固件侧收到的字段少一些不会报错。

---

## 14. 主动推送（0x87 / 0x10 / 0x0c / 0x0f）订阅

### 14.1 路由表

`useEKeysDevice.onPush(handler)` 在 hook 内部已经按 `cmd` 分发：

| 帧                    | 处理                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cmd = 0x87, seq = 0` | 全量 `DeviceSettings` 推送 → `maskSensitive` → 更新 `snapshot.config` → 触发 `useDeviceDraft.mergeFromPush` |
| `cmd = 0x10, seq = 0` | `profile_state` 顶层 → 更新 `snapshot.profile` + `KeymapEditor` 触发刷新                                    |
| `cmd = 0x0c`          | `VoiceTextPush` 顶层 → 写入 Voice Tab 最近 N 条 + Toast                                                     |
| `cmd = 0x0f`          | `MusicControl` 顶层 → 写入 Log（占位，预留 UI）                                                             |
| 其他 `isPush`         | Log + Toast 提示（未知推送）                                                                                |

### 14.2 推送与草稿合并（关键）

桌面端 [`app.rs::handle_link_event`](../../EKeysApp/src/app.rs) 的合并语义必须**完整复用**：

```ts
// src/hooks/useDeviceDraft.ts
function mergeFromPush(newSnap, oldMask, newMask) {
  setDraft((draft) =>
    mergePush(newSnap, snapshot.config, oldMask, newMask, draft),
  );
  // snapshot.config 在 useEKeysDevice 收到 0x87 时已更新为脱敏后的 newSnap
}
```

`mergePush` 仅在 `oldMask.intersect(newMask)` 置位的字段上做"草稿优先"合并；未改动的字段被推送刷新。

---

## 15. 会话日志与错误反馈

### 15.1 `useDeviceLog` Hook

```ts
export function useDeviceLog() {
  return {
    entries: LogEntry[];        // 环形缓冲 ≤ 2000 条
    clear(): void;
    filter: { tx?: boolean; rx?: boolean; firmware?: boolean; app?: boolean; level?: "info"|"warn"|"error" };
  };
}

export type LogEntry = {
  ts: number;
  channel: "tx" | "rx" | "firmware" | "app";
  level: "info" | "warn" | "error";
  text: string;
};
```

### 15.2 日志分类

- **TX**：每次 `sendCmd` 写入（蓝色，调用栈前 4 字符 + payload）；
- **RX**：每次 `useEKeysDevice.onFrame` 触发（绿色，仅展示 ack / push）；
- **Firmware**：`useSerial.onLogLine` 收到的非 JSON 行（灰白）；
- **App**：`onError` / Toast / 推送事件（浅黄）。

### 15.3 Log Tab 交互

- 顶栏：四类多选 checkbox + 关键词搜索；
- 中部：虚拟列表（react-virtuoso 或 `react-window`）渲染 ≥2000 条不卡顿；
- 右键 / 工具栏：「清空」「导出 JSON」「复制单行」。

### 15.4 错误反馈

复用现有 `ErrorBanner` 组件，i18n key 走 `config.error.*`，新增的 `DeviceError.kind`：

| kind            | i18n key                     | 文案                        |
| --------------- | ---------------------------- | --------------------------- |
| `unsupported`   | `config.error.unsupported`   | 当前浏览器不支持 Web Serial |
| `userCancelled` | `config.error.userCancelled` | 用户取消了设备选择          |
| `portBusy`      | `config.error.portBusy`      | 串口正被其他程序占用        |
| `noPort`        | `config.error.noPort`        | 未找到 EKeys 设备           |
| `openFailed`    | `config.error.openFailed`    | 打开串口失败                |
| `writeFailed`   | `config.error.writeFailed`   | 写入失败（设备已拔出？）    |
| `timeout`       | `config.error.timeout`       | 请求超时                    |
| `protocol`      | `config.error.protocol`      | 设备返回错误                |
| `heartbeatLost` | `config.error.heartbeatLost` | 心跳丢失                    |
| `deviceLost`    | `config.error.deviceLost`    | 设备连接已断开              |
| `unknown`       | `config.error.unknown`       | 未知错误                    |

---

## 16. i18n 与设计 token 复用

### 16.1 i18n key 命名约定

新增 key 统一前缀：

| 区域             | 前缀         | 示例                                                       |
| ---------------- | ------------ | ---------------------------------------------------------- |
| ConfigPanel 通用 | `config.*`   | `config.title`, `config.connect`                           |
| Settings Tab     | `settings.*` | `settings.section.connection`, `settings.field.wifiSwitch` |
| Keymap Tab       | `keymap.*`   | `keymap.title`, `keymap.layer.base`                        |
| Lighting Tab     | `lighting.*` | `lighting.mode.solid`                                      |
| Audio Tab        | `audio.*`    | `audio.title`, `audio.bind.unbound`                        |
| Voice Tab        | `voice.*`    | `voice.title`, `voice.field.secretId`                      |
| OTA Tab          | `ota.*`      | `ota.title`, `ota.button.start`                            |
| Log Tab          | `log.*`      | `log.filter.tx`, `log.export`                              |
| About Tab        | `about.*`    | `about.firmware`, `about.protocolMismatch`                 |
| 错误             | `error.*`    | `error.portBusy`                                           |

新增语言：在 [`src/i18n/dict.ts`](../../src/i18n/dict.ts) 补齐键值并在 [`src/i18n/useI18n.tsx`](../../src/i18n/useI18n.tsx) `Lang` 联合类型里追加。

### 16.2 设计 token 复用

- 复用 `styles/tokens.css` 的颜色 / 间距 / 圆角变量；
- 复用 `styles/buttons.css` 的 `.btn .btn--primary .btn--ghost`；
- 复用 `styles/animations.css` 的 transition 时长；
- 主题切换由 [`I18nProvider`](../../src/i18n/useI18n.tsx) 的 `data-theme` 属性统一驱动，新增页面不应使用内联颜色。

---

## 17. 安全 / 隐私约束

1. **HTTPS 强制**：Web Serial 仅在 `localhost` 或 HTTPS 下可用；部署文档必须显式声明；
2. **CSP**：`connect-src 'self'` 即可，OTA / 局域网访问不通过 Web（避免被 CSP 拦截）；
3. **不持久化任何设备快照**：包括敏感字段。`localStorage` 只存语言 / 主题 / 上次固件路径元信息（文件名 + 大小，**不含内容**）；
4. **剪贴板**：复制按钮复制用户当前编辑值，不复制 `***`；
5. **PII 标记**：`wifi_password` / `voice_tencent_secret_*` 三个字段在 `<input>` 上加 `autocomplete="new-password"`；
6. **错误信息脱敏**：Web Serial 抛错可能含设备路径，避免直接展示完整 message，统一走 `i18n` + 折叠 `<details>` 展示原始 message。

---

## 18. 浏览器兼容性矩阵

| 能力                            | Chrome 89+       | Edge 89+ | Safari | Firefox         |
| ------------------------------- | ---------------- | -------- | ------ | --------------- |
| Web Serial                      | ✅               | ✅       | ❌     | ❌（实验 flag） |
| SubtleCrypto MD5                | ✅               | ✅       | ✅     | ✅              |
| ReadableStream / WritableStream | ✅               | ✅       | ✅     | ✅              |
| `setSignals`                    | ✅ 81+           | ✅ 81+   | ❌     | ❌              |
| BigInt                          | ✅               | ✅       | ✅     | ✅              |
| `navigator.connection`          | ✅（仅部分平台） | ✅       | ❌     | ❌              |

> 主页 `README.md` 与 `/config` 路由顶部 banner 必须提示：**仅支持 Chrome / Edge 桌面版**。

---

## 19. 测试策略

### 19.1 协议层（vitest，必须 100% 覆盖关键路径）

```
src/protocol/__tests__/
├── frame.test.ts        # encode/decode/parseLine/tryParseLine
├── settings.test.ts     # clamp / diff / apply / mergePush / maskSensitive
├── mask.test.ts         # set/test/intersect/union/边界
├── keymap.test.ts       # toFirmwareEntries / applyFirmwareEntries 双向
├── audio.test.ts        # 文件名白名单 / sanitize / 块大小校验
└── commands.test.ts     # 22 条常量值 / responseCmd / isResponseLike
```

对齐桌面端 `protocol.rs` 的测试模块：

- `field_constants_are_contiguous` → `commands.test.ts` 校验 25 个 `F_*` 连续无空洞；
- `diff_and_apply_cover_all_fields` → `settings.test.ts` 构造全字段 diff，断言 apply 后与原文相等；
- `merge_push_covers_all_fields` → `settings.test.ts` 同上。

### 19.2 Hook 层（vitest + happy-dom / jsdom）

```
src/hooks/__tests__/
├── useEKeysDevice.test.tsx   # connect 拉取快照 / disconnect 释放 / 心跳超时 / sendCmd 队列
├── useDeviceDraft.test.tsx   # patch / consume / reset / mergeFromPush
└── useSerial.test.ts        # mock navigator.serial，验证行解析 / 关闭序列
```

### 19.3 组件层（vitest + @testing-library/react）

- `ConfigPanel`：快照渲染、按钮状态、错误 banner；
- `KeymapEditor`：4 层切换、unbound 提示；
- `AudioUploader`：上传进度、abort、删除；
- `Log`：过滤 + 搜索。

### 19.4 E2E（Playwright，可选）

需要本地接 EKeys 真机，CI 跳过：

- 连接 → 拉快照 → 修改 Wi-Fi SSID → 设备侧确认收到；
- 上传 1MB 音频 → 绑定到 key 1 → 试播。

---

## 20. 里程碑与交付物

| 阶段               | 范围                                                     | 交付物                                                     |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------- |
| **M0（已完成）**   | 当前 `ConfigPage` 只读快照                               | `ConfigPanel` + `useSerial` + `useEKeysDevice` 最小骨架    |
| **M1（本期 1/4）** | 协议层 TS 化 + Settings Tab 全字段读写 + 心跳 + 推送合并 | `src/protocol/` + Settings Tab + 测试                      |
| **M2（2/4）**      | Lighting / Voice / About / Log Tab                       | `LightingPanel` / `VoicePanel` / `AboutPanel` / `LogPanel` |
| **M3（3/4）**      | Keymap Tab 编辑 + Profile 切换 + Profile 图标上传        | `KeymapEditor` + `useKeymapEditor`                         |
| **M4（4/4）**      | Audio Pad 上传 / 绑定 / 试播 + OTA                       | `useAudioUploader` + `useOtaWorker`                        |
| **M5**             | PC Status 推送（可选）+ 全量单测 + E2E                   | 协议字段兼容层 + Playwright                                |
| **M6**             | 文档 / 部署 / 性能优化                                   | `README.md` 更新 + Lighthouse ≥ 90                         |

---

## 21. 附录 A：命令清单与 App 接入现状映射

来源：[`protocol-usage.md` §2](https://github.com/EndThemex/EKeysApp/blob/main/docs/protocol-usage.md)。

| 命令                   | 常量            | 值              | Web 接入                               |
| ---------------------- | --------------- | --------------- | -------------------------------------- |
| ConfVer GET / SET      | `0x01` / `0x02` | `0x01` / `0x02` | M1：About Tab 展示 + 协议版本警告      |
| Device Info GET / SET  | `0x03` / `0x04` | `0x03` / `0x04` | M1：About Tab 展示 / M1+：About 重命名 |
| Keymap GET / SET       | `0x05` / `0x06` | `0x05` / `0x06` | M3：KeymapEditor                       |
| Config GET / SET       | `0x07` / `0x08` | `0x07` / `0x08` | M1：Settings Tab 全字段读写            |
| Key Event              | `0x09`          | `0x09`          | 暂不订阅（固件未实现）                 |
| Heartbeat              | `0x0a`          | `0x0a`          | M1：`useEKeysDevice` 自动发送          |
| Firmware Info / OTA    | `0x0b`          | `0x0b`          | M4：OTA Tab                            |
| Voice Text             | `0x0c`          | `0x0c`          | M2：Voice Tab 推送展示                 |
| PC Status              | `0x0d`          | `0x0d`          | M5：可选                               |
| Music Status / Control | `0x0e` / `0x0f` | `0x0e` / `0x0f` | M2：仅订阅推送                         |
| Profile State          | `0x10`          | `0x10`          | M1：Profile 卡 + 推送刷新              |
| Profile Icon Set       | `0x11`          | `0x11`          | M3：上传 / 清除图标                    |
| HA Status              | `0x12`          | `0x12`          | 暂不接入（固件未实现）                 |
| Time Set               | `0x13`          | `0x13`          | M1：连接后立即发送                     |
| Firmware Download      | `0x14`          | `0x14`          | M4：OTA 入口                           |
| Profile Name Set       | `0x15`          | `0x15`          | M3：Profile 重命名                     |
| Audio File             | `0x16`          | `0x16`          | M4：音效上传 / 删除                    |
| Audio Pad              | `0x17`          | `0x17`          | M4：音效绑定 / 播放                    |

> 注：上表已含 22 条命令 ID；与桌面端 `protocol.rs:122` 起声明的 22 个 `CMD_*` 常量一一对应（除 `0x0e` Music Status 在桌面端当前仅声明未接通、Web 端同样仅订阅）。

---

## 22. 附录 B：与桌面 App 的差异与限制

| 维度      | 桌面 App                         | Web 端                                               |
| --------- | -------------------------------- | ---------------------------------------------------- |
| 串口库    | `serialport` 4.6                 | Web Serial API                                       |
| 心跳线程  | 后台 `std::thread`               | `setInterval` + `visibilitychange`                   |
| 后台保活  | 系统进程                         | 浏览器可能休眠 Tab → 推送可能丢失                    |
| OTA HTTP  | 自建一次性 HTTP                  | 浏览器**不能**监听端口；M4 改用 USB-Serial-JTAG 直写 |
| PC Status | Windows API 取 Lock / 网络 / CPU | 仅 `navigator.*` 近似值                              |
| 持久化    | `%APPDATA%/wxi/config.json`      | `localStorage`（仅语言 / 主题）                      |
| 主题      | 深 / 浅 + 自定义调色板           | 沿用现有 `data-theme`                                |
| 多语言    | Rust 端 i18n                     | 沿用 [`dict.ts`](../../src/i18n/dict.ts)             |
| 错误反馈  | Toast / Confirm                  | `<ErrorBanner>` + Log Tab                            |
| OTA 校验  | MD5 + HTTP 服务                  | MD5 + 直写（无 HTTP 校验环节）                       |

> 这些差异**不影响协议层兼容性**；固件侧对两端一视同仁。
