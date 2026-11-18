# AI Mode 图像推流 — Web 端发送实现方案

> 面向 **浏览器端 AI 推流面板**（`/config` 下新增 AI Tab）的设计与实现说明。
> 依据固件端 [`EKeys/docs/13-ai-mode-image-streaming.md`](../../../EKeys/docs/13-ai-mode-image-streaming.md)（阶段 13 评审稿）编制，二进制帧协议以该文档 §4.2 为唯一权威。
> 与 [`web-config-design.md`](./web-config-design.md) 的骨架共存：复用 `useSerial` / `useEKeysDevice` / `DeviceSessionContext`，不改动现有 0x01~0x17 JSON 协议。

## 0. 目录

1. [目标与结论](#1-目标与结论)
2. [通道选择：Web 端只有 USB CDC](#2-通道选择web-端只有-usb-cdc)
3. [二进制帧协议（TS 编码器）](#3-二进制帧协议ts-编码器)
4. [图像内容管线（Canvas，零新依赖）](#4-图像内容管线canvas零新依赖)
5. [架构集成](#5-架构集成)
6. [状态机与流控](#6-状态机与流控)
7. [UI 设计（AI Tab）](#7-ui-设计ai-tab)
8. [i18n 与 token](#8-i18n-与-token)
9. [浏览器兼容性与限制](#9-浏览器兼容性与限制)
10. [分阶段实施计划](#10-分阶段实施计划)
11. [风险与规避](#11-风险与规避)
12. [验收标准](#12-验收标准)
13. [附录 A：帧编码参考实现（TypeScript）](#附录-a帧编码参考实现typescript)
14. [附录 B：待实机验证项](#附录-b待实机验证项)

---

## 1. 目标与结论

**结论：可以发送自定义显示内容到硬件——但 Web 端仅限 USB CDC 一条通道。**

固件端 AI Mode 是"外部主机推流、设备接收显示"模式。浏览器通过 **Web Serial API** 直接向 USB CDC 写入固件定义的二进制帧，即可把任意自定义内容（本地图片、剪贴板图像、Canvas 渲染的文字/图表、屏幕截图）推到 428×142 屏幕。

**不在本期范围**：

- **WiFi TCP :30001**：浏览器无法创建原始 TCP socket（Direct Sockets API 尚未标准化），此通道留给桌面端 EKeysApp；
- 不改动现有 JSON 行协议（0x01~0x17）；
- 不做端到端加密/鉴权（固件 P3 预留 token）。

## 2. 通道选择：Web 端只有 USB CDC

| 维度 | Web Serial（USB CDC） | WiFi TCP :30001 |
| --- | --- | --- |
| 浏览器可行性 | ✅ Chrome/Edge 桌面版 | ❌ 无原始 socket 能力 |
| 吞吐 | TinyUSB Full-Speed ~0.7~1.2 MB/s（`baudRate` 只是虚拟值） | 1~4 MB/s |
| JPEG 12KB 帧率 | 12~18 fps | — |
| 与 JSON 协议共存 | 差：固件二进制态会吞 JSON（固件 §4.4 规则 5/6），推流期间心跳必须暂停 | 独立通道无冲突 |

推流必须满足的固件侧前提：

1. 设备停在 **AI 页**（固件仅在 AI 页激活 `AiLink` 并门控串口分流）；
2. 每个新帧前先发 `'\n'`（0x0A）再发帧头 magic `A5 5A`（固件 JSON/二进制定界依据）；
3. 先收设备回的 `hello` JSON 行，再开始发帧。

## 3. 二进制帧协议（TS 编码器）

### 3.1 帧头（24 字节，小端）

| 偏移 | 类型 | 字段 | Web 端填写 |
| --- | --- | --- | --- |
| 0 | u16 | magic | `0x5AA5`（字节序 `A5 5A`） |
| 2 | u8 | version | 1 |
| 3 | u8 | type | 1=JPEG（主用），2=RGB565，3=RLE565 |
| 4 | u16 | frame_id | 自增，u16 回绕 |
| 6 | u16 | width | 428（高画质模式 856 + `flags.bit0=1`） |
| 8 | u16 | height | 142（对应 284） |
| 10 | u8 | flags | bit0=`scale_half`，bit1=带 frame_crc32（建议恒置 1） |
| 11 | u8 | reserved | 0 |
| 12 | u32 | payload_len | JPEG ≤ 65536；RGB565 ≤ 131072 |
| 16 | u32 | frame_crc32 | 负载 CRC32 |
| 20 | u16 | chunk_payload | **USB = 4096** |
| 22 | u16 | header_crc16 | CRC16-CCITT，覆盖 0~21 字节 |

### 3.2 分片（8 字节头 + 负载，严格按序）

| 偏移 | 类型 | 字段 |
| --- | --- | --- |
| 0 | u16 | frame_id |
| 2 | u16 | chunk_index（从 0 起） |
| 4 | u16 | chunk_len |
| 6 | u16 | chunk_crc16 | CRC16-CCITT（建议恒填） |

- 分片数 = `ceil(payload_len / 4096)`，最后一片允许小于上限；
- 每个 chunk 逐个 `await writer.write(chunk)`（见 §5.2），不合并大 buffer。

### 3.3 握手与流控

TCP/USB 进入推流前先等设备回 `hello` 行：

```json
{"ai_ctl":{"kind":"hello","result":0,"frame_id":0,"w":428,"h":142,
 "formats":[1,2,3],"chunk_payload":8192,"max_payload":65536,
 "max_raw_payload":131072,"version":1,"free_slots":2,"dropped":0,
 "fps_x10":0,"bytes_per_sec":0}}
```

- 校验 `formats` 含 1（JPEG）、`w/h` = 428×142（或 856×284 + scale_half）；
- 后续 ACK/NACK/统计同为 `ai_ctl` JSON 行（`result`：0=OK / 1=CRC / 2=尺寸超限 / 3=busy / 4=超时）。

**流控（必须实现）**：最多 **2 帧未 ACK**；收到 `result=3`（busy）停发至下一 ACK。没有流控时延迟持续累积。

**帧号**：固件按 `(u16)(new - last) == 1`（或 0=重发）接受；Web 端 u16 自然回绕即可，无重发逻辑（固件丢帧即丢，直接发下一帧）。

## 4. 图像内容管线（Canvas，零新依赖）

浏览器管线全部用原生 API，**不需要引入任何图像处理库**：

```
内容源                          Canvas 管线                        发送
──────────────────────────────────────────────────────────────────────────
图片文件 <input type=file>  ─┐
剪贴板 ClipboardItem       ─┼→ createImageBitmap(source)
Canvas 绘制文字/图表        ─┤        │
屏幕捕获 getDisplayMedia    ─┘        ▼
                             OffscreenCanvas(w, h) 2D context
                               drawImage(..., cover 裁剪)  ← 统一到 428×142
                               │（可选 856×284 高画质 + scale_half）
                               ▼
                             canvas.convertToBlob({ type:"image/jpeg", quality:0.75 })
                               ▼
                             blob.arrayBuffer() → Uint8Array（8~15KB）
                               ▼
                             encodeFrame(type=1, jpeg, 4096) → 逐片 writeRaw()
```

- JPEG quality 0.75，单帧 8~15KB，远小于 64KB 上限；
- 比例不一致时 `drawImage` 按 cover（居中裁剪 + 缩放）适配，避免固件 NACK；固件端不做任意缩放（固件 §5.4）；
- RGB565 原始帧（type=2）作为无解码备选：手写 565 转换（121,552B/帧，USB 下仅 6~8fps），默认不启用，仅用于画质基准验证；
- 文字内容（如把 AI 输出渲染上屏）：Canvas 2D `fillText` 直接绘制，中文用系统字体即可，不必等固件端 CJK 字体。

### 4.1 内容源分期

| 阶段 | 内容源 | 说明 |
| --- | --- | --- |
| P0 | 图片文件 | `<input type="file" accept="image/*">` → 单帧"推送一次" |
| P1 | 定时循环推流 | fps 1~20 滑条 + 推流开关；每帧走完整管线 |
| P2 | 文字/简单图形面板 | AI Tab 内置 Canvas 编辑区（文本 + 底色 + 对齐），实时渲染推流 |
| P2 | 屏幕捕获 | `getDisplayMedia` + `<video>` 抽帧（需用户每次授权，HTTPS 前提） |
| P3 | 剪贴板图像、动图逐帧 | `navigator.clipboard.read()` / gif 帧序列 |

## 5. 架构集成

### 5.1 模块清单

| 模块 | 职责 | 不允许 |
| --- | --- | --- |
| `src/protocol/aiFrame.ts` | 帧编码/分片/CRC16-CCITT/CRC32/`parseAiCtlLine`（纯函数） | IO、React、DOM |
| `src/protocol/__tests__/aiFrame.test.ts` | 与固件 Python 参考实现逐字节比对 | — |
| `src/hooks/useAiStream.ts` | 会话状态机 + 握手 + 流控窗口 + 统计 | UI 渲染 |
| `src/components/AiStreamPanel/` | AI Tab：内容源 / 推流开关 / fps / 预览 / 统计 | 直连 serial |
| `src/hooks/useSerial.ts`（改） | 新增 `writeRaw(Uint8Array)` | 协议常量 |
| `src/hooks/useEKeysDevice.ts`（改） | `ai_ctl` 行识别转发 + 心跳暂停 | — |

### 5.2 `useSerial` 补强：`writeRaw`

现有 [`useSerial.ts`](../src/hooks/useSerial.ts) 的 `write(line: string)` 只支持 JSON 文本行。新增：

```ts
export interface EKeysSerial {
  write: (line: string) => Promise<void>;
  /** 写入原始字节（AI 二进制帧分片）。不追加任何分隔符。 */
  writeRaw: (data: Uint8Array) => Promise<void>;
  // ...其余不变
}
```

```ts
async writeRaw(data: Uint8Array) {
  if (closed) throw new Error("serial closed");
  await writer.write(data); // Web Serial 直接支持二进制 Uint8Array
},
```

**读取方向不需要改**：固件设备→主机方向始终是 JSON 行（`ai_ctl`/日志），无二进制回显；现有"按 `\n` 切行 + `{` 开头进 JSON"的解析完全兼容。

### 5.3 `useEKeysDevice` 补强：`ai_ctl` 路由与心跳暂停

1. **`ai_ctl` 识别转发**：`ai_ctl` 行以 `{` 开头，会被现有 readLoop 解析成对象并进 `frameCallbacks`，但它没有 `cmd` 字段、不应进 pending 配对。在 `handleFrame` 入口增加分流：

```ts
if ("ai_ctl" in frame && !("cmd" in frame)) {
  aiCtlCallbacks.forEach((cb) => cb(frame.ai_ctl as AiCtlMsg));
  return; // 不进 pending / push / 日志 Rx 通道
}
```

   新订阅接口：`onAiCtl(handler: (msg: AiCtlMsg) => void): () => void`。

2. **心跳暂停**：固件处于二进制态时，0x0a 心跳会被帧解析器吞掉 → 3 次超时把 phase 切回 `idle`（§5.5 of web-config-design）。`useEKeysDevice` 暴露 `pauseHeartbeat()/resumeHeartbeat()`；`useAiStream` 启动推流时 pause、停止/出错时 resume。**两处调用必须成对**（`try/finally` 保证 resume）。

3. **推流期间禁止 `sendCmd`**：现有 JSON 命令（0x07/0x0a/0x08…）在二进制态会被固件吞掉或污染帧流。`useAiStream` 推流期间在 `DeviceSessionContext` 上置 `aiStreaming` 标志，`sendCmd` 检测到该标志时直接 reject `{ kind: "aiStreaming" }`（新增错误 kind，见 §8）。

### 5.4 数据流约定（沿用 §2.2 of web-config-design）

```
AI Tab 组件
   │ useAiStream()
   ▼
┌─────────────────────────────┐
│ useAiStream                  │
│  - handshake(): 等 hello     │
│  - start/stop(): 状态机      │
│  - 流控窗口 (2 帧在途)        │
│  - stats: fps/带宽/ dropped  │
└──────┬───────────────▲──────┘
       │ writeRaw      │ onAiCtl (hello/ack/stats)
       ▼               │
   useSerial        useEKeysDevice（心跳 pause + ai_ctl 转发）
       ▼
  [ EKeys 设备 · AI 页 ]
```

- 推流循环用 `setTimeout` 链（非 `requestAnimationFrame`——rAF 在 Tab 隐藏时停发，反而更安全）；fps ≤ 20 无需 Worker，`convertToBlob` 编码 8~20ms/帧在主线程可接受，实测卡顿再迁 `OffscreenCanvas` Worker；
- 每个 chunk 逐个 `await writeRaw()`，让出事件循环，避免 12KB 单帧阻塞 UI；
- 统计经 `onAiCtl` 的 `fps_x10` / `bytes_per_sec` / `dropped` 直接透传 UI，不自行估算。

## 6. 状态机与流控

```
Idle ──用户点「连接推流」──► Handshake（发 '\n' 探测 + 等 hello，3s 超时）
Handshake ──hello ok──► Ready（可单帧推送）
Ready ──start loop──► Streaming（2 帧在途窗口，pause 心跳，屏蔽 sendCmd）
Streaming ──stop──► Ready（resume 心跳，恢复 sendCmd）
任意态 ──连续 NACK / hello 超时 / deviceLost──► Failed（原因入日志，可重试）
Failed / 任意态 ──disconnect──► Idle（resume 心跳，端口正常释放）
```

- **Handshake 超时的针对性提示**：`hello` 不到 = 设备不在 AI 页（或固件未实现 AI 模式）。文案明确引导："请旋转旋钮将设备切到 AI MODE 页后再试"；
- **`result=2`（尺寸/超限）**：显示实际收到的尺寸对照（固件 §5.4），引导用户检查高画质开关；
- **Stop 语义**：停止循环 + resume 心跳即可，无需通知固件（固件靠 300ms 半帧超时自动复位解析器）。

## 7. UI 设计（AI Tab）

### 7.1 路由

`/config` 二级路由追加（对应 web-config-design.md §6.1）：

```tsx
<Route path="ai" element={<AiStreamTab />} />
```

`ConfigLayout` 的连接状态胶囊复用；未连接时禁用 Tab 内容，与其它 Tab 一致。

### 7.2 面板结构

```
src/components/AiStreamPanel/
├── AiStreamPanel.tsx      # 顶层：状态机展示 + 启停控制
├── ContentSource.tsx      # 内容源选择（P0 文件 / P2 文字面板 / P2 屏幕捕获）
├── StreamStats.tsx        # fps / 带宽 / dropped（2Hz 来自 ai_ctl）
└── PreviewCanvas.tsx      # 428×142 等比预览（与设备显示 1:1）
```

| 区块 | 控件 | 说明 |
| --- | --- | --- |
| 状态 | 状态胶囊 + 错误 banner | Idle/Handshake/Ready/Streaming/Failed |
| 内容源 | Tab 切换 + 文件选择/文字输入框 | P0 仅文件 |
| 推送 | 「推送一次」按钮 + 「开始/停止推流」 + fps 滑条（1~20） | fps 滑条 P1 |
| 高画质 | Switch「856×284 + 1/2 缩放」 | 文字更锐利；与 `flags.bit0` 联动 |
| 统计 | fps / KB/s / 设备 dropped 计数 | Streaming 时实时刷新 |
| 预览 | 428×142 缩略画布 | 推流内容所见即所得 |

## 8. i18n 与 token

- 新增 key 前缀 `ai.*`（进 [`src/i18n/dict.ts`](../src/i18n/dict.ts)）：`ai.title`、`ai.state.handshake`、`ai.hint.notOnAiPage`、`ai.hint.serialPaused`、`ai.error.busy`、`ai.error.sizeMismatch` 等；
- 新增错误 kind `aiStreaming`（推流期间 sendCmd 被 reject）：`error.aiStreaming` → "AI 推流进行中，串口配置命令已暂停"；
- 样式复用 `styles/tokens.css` / `buttons.css`，主题由 `data-theme` 驱动，不用内联颜色。

## 9. 浏览器兼容性与限制

| 项目 | 说明 |
| --- | --- |
| 浏览器 | 仅 Chrome / Edge 桌面版（Web Serial，与现有约束一致）；Safari/Firefox 显示不支持 banner |
| 安全上下文 | Web Serial 要求 HTTPS 或 localhost（现有部署约束，不新增） |
| Tab 切后台 | `setTimeout` 被节流至 ≥1s → 推流自动降速但不中断；切回前台恢复。心跳此时也被暂停，靠 `visibilitychange` 补发逻辑保持——推流期间心跳本来就应静默，行为一致 |
| 主线程占用 | Canvas resize + JPEG 编码 8~20ms/帧；fps=20 时约 30% 主线程，可接受；实测卡顿再迁 OffscreenCanvas Worker（接口不变） |
| 内存 | 单帧在途 buffer ≤ 2×15KB，无累积；预览 Canvas 常驻 < 1MB |
| WiFi TCP | 浏览器不可用；面板文案注明"WiFi 通道请使用桌面端 EKeysApp" |

## 10. 分阶段实施计划

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| **P0** | `aiFrame.ts` 帧编码器 + CRC + vitest 单测（对照固件附录 A Python 逐字节比对）；`useSerial.writeRaw` | 单测字节一致；向已进 AI 页的设备手工发一帧静态 JPEG，屏幕正确显示 |
| **P1** | `useAiStream`（握手/流控/状态机）+ `useEKeysDevice`（ai_ctl 转发、心跳 pause）+ AI Tab（文件源 + 单帧 + 循环推流） | 实机推静态图 ≥12fps 连续 10 分钟无花屏；推流期间心跳不假超时；停止推流后 1s 内 0x07/0x0a 恢复正常应答 |
| **P2** | 文字/图形 Canvas 编辑源；屏幕捕获源；856×284 高画质模式 | 文字渲染清晰上屏；getDisplayMedia 推流 ≥10fps |
| **P3** | 剪贴板/动图；RGB565 基准模式；Direct Sockets TCP 通道（浏览器标准化后） | 按需 |

## 11. 风险与规避

| 风险 | 影响 | 规避 |
| --- | --- | --- |
| 推流期间心跳被固件吞掉 | 心跳假超时 → phase 切 idle → 串口被误关 | 推流期 pause 心跳 + `try/finally` 保证 resume（§5.3） |
| JSON 命令与二进制帧交织 | 固件帧 CRC 失败 / JSON 行污染 | 推流期 `sendCmd` reject（`aiStreaming` kind）+ UI 胶囊提示 |
| `'\n'` 前缀缺失 | 固件 JSON 行解析器永远无法与二进制同步 | 编码器固定输出 `'\n' + header`（编码器内部保证，调用方不可绕过） |
| 忘记等 hello 直接发帧 | 固件未进二进制态，帧头被当 JSON 垃圾 | 状态机强制 Handshake → Ready 才允许发帧 |
| Tab 后台节流 | 推流降速 | 可接受（降速不断流）；文档注明"推流时请保持标签页前台" |
| Web Serial 写入并发 | `writer.getWriter()` 独占锁，两处同时 write 抛错 | 所有写入（JSON 与 Raw）经同一 writer 实例串行 await；`useAiStream` 与 `sendCmd` 不并发（aiStreaming 屏蔽已保证） |
| 设备不在 AI 页 | hello 超时 | Handshake 超时文案引导（§6） |
| CRC32 实现不一致 | 固件全帧拒收 | 用标准 CRC-32（IEEE 802.3，zlib 同款）查表实现 + 单测对照 Python `zlib.crc32` |

## 12. 验收标准

1. 设备停在 AI 页，Chrome 推送本地图片：屏幕完整显示、无平铺/花屏/撕裂，≥12fps 连续 10 分钟。
2. 流控生效：2 帧在途上限；固件 `dropped` 计数与 AI Tab 统计一致。
3. 推流全程：心跳 pause 不产生 `heartbeatLost`；停止推流后 1s 内配置 GET / 心跳恢复正常应答。
4. 推流期间点击其它 Tab 的「应用待下发」：收到 `aiStreaming` 错误提示，无帧流污染。
5. 尺寸错误场景：关闭 cover 裁剪强制发非 428×142 帧 → 固件 NACK `result=2`，UI 显示尺寸对照。
6. 停止推流/离开 Tab：状态机回 Idle，无定时器/订阅泄漏（React StrictMode 双挂载下无重复推流）。
7. 文字内容（P2）：Canvas 渲染中文清晰上屏，主题深浅色切换生效。

## 附录 A：帧编码参考实现（TypeScript）

```ts
// src/protocol/aiFrame.ts
export const AI_MAGIC = 0x5aa5;
export const AI_TYPE_JPEG = 1;
export const AI_CHUNK_USB = 4096;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) */
export function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** CRC-32 (IEEE 802.3, 与 zlib.crc32 一致)，查表实现 */
const CRC32_TABLE = /* 256 项查表，生成代码略 */;
export function crc32(data: Uint8Array): number { /* 查表循环 */ }

/** 完整的"分片字节块"序列；首块前含 '\n' 前缀（固件 USB 分流定界依据）。 */
export function encodeFrame(
  frameId: number,
  jpeg: Uint8Array,
  chunkPayload = AI_CHUNK_USB,
  width = 428,
  height = 142,
  scaleHalf = false,
): Uint8Array[] {
  const header = new Uint8Array(24);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, AI_MAGIC, true);
  dv.setUint8(2, 1); // version
  dv.setUint8(3, AI_TYPE_JPEG);
  dv.setUint16(4, frameId, true);
  dv.setUint16(6, width, true);
  dv.setUint16(8, height, true);
  dv.setUint8(10, scaleHalf ? 0x03 : 0x02); // flags: crc32 + 可选 scale_half
  dv.setUint8(11, 0);
  dv.setUint32(12, jpeg.length, true);
  dv.setUint32(16, crc32(jpeg), true);
  dv.setUint16(20, chunkPayload, true);
  dv.setUint16(22, crc16(header.subarray(0, 22)), true);

  const nChunks = Math.ceil(jpeg.length / chunkPayload);
  const pkts: Uint8Array[] = [];
  const first = new Uint8Array(1 + 24);
  first[0] = 0x0a; // '\n'
  first.set(header, 1);
  pkts.push(first);

  for (let idx = 0; idx < nChunks; idx++) {
    const start = idx * chunkPayload;
    const part = jpeg.subarray(start, Math.min(start + chunkPayload, jpeg.length));
    const pkt = new Uint8Array(8 + part.length);
    const pdv = new DataView(pkt.buffer);
    pdv.setUint16(0, frameId, true);
    pdv.setUint16(2, idx, true);
    pdv.setUint16(4, part.length, true);
    pdv.setUint16(6, crc16(part), true);
    pkt.set(part, 8);
    pkts.push(pkt);
  }
  return pkts;
}

/** 从 JSON 行对象中识别 ai_ctl（供 useEKeysDevice 分流）。 */
export function isAiCtlLine(obj: Record<string, unknown>): boolean {
  return "ai_ctl" in obj && !("cmd" in obj);
}
```

> 单测：用固件文档附录 A 的 Python 脚本生成同参数帧 → 存为 fixture JSON → `expect(encodeFrame(...)).toEqual(fixture)` 逐字节比对（P0 必须）。`CRC32_TABLE` 由脚本生成后提交，避免手抄错误。

## 附录 B：待实机验证项

1. Web Serial 实测吞吐（连续推 12KB JPEG 统计 ACK 频率），对照固件估算 12~18fps。
2. `hello` 握手在设备刚切到 AI 页时的到达延迟（TCP 场景固件在连接建立即发；USB 场景由 `'\n' + magic` 触发进二进制态，验证 hello 是否在首帧后才返回——若是，握手流程需改为"发探针帧 + 等首个 ai_ctl"）。
3. Tab 切后台再切回，推流恢复的延迟与丢帧表现。
4. fps=20 时主线程占用（Performance 面板），决定是否提前迁 OffscreenCanvas Worker。
5. `ai_ctl` 行与固件日志混流时的解析稳定性（固件日志不以 `{` 开头，理论无冲突）。
