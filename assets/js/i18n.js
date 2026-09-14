/* ============================================================
   i18n.js — minimal EN/ZH runtime for EKeysWeb
   ============================================================ */
(function () {
  const STORAGE_KEY_LANG = "ek_lang";
  const STORAGE_KEY_THEME = "ek_theme";

  const DICT = {
    en: {
      "nav.home": "Home",
      "nav.features": "Features",
      "nav.specs": "Specs",
      "nav.docs": "Get started",
      "nav.github": "GitHub",

      "hero.eyebrow": "A tiny keyboard with a big personality",
      "hero.title.1": "MEET EKEYS",
      "hero.title.2": "YOUR DESK JUST GOT SMARTER",
      "hero.lede":
        "A pocket-sized 11-key pad that puts your favorite shortcuts, lighting scenes and tiny screen within thumb’s reach. Plug it in, pick a scene, and get back to what you actually love doing.",
      "hero.cta.primary": "See what it can do",
      "hero.cta.secondary": "How it works",
      "hero.meta.chip": "Brain",
      "hero.meta.keys": "Keys",
      "hero.meta.link": "Connects via",
      "hero.meta.app": "Customize with",
      "hero.meta.chip.v": "ESP32-S3 · 240 MHz",
      "hero.meta.keys.v": "11 keys + 1 knob",
      "hero.meta.link.v": "USB-C · Bluetooth",
      "hero.device.tag": "EKEYS / V0.1",

      "site.title.home": "EKeys · Macropad for people who build",
      "site.title.features": "Features · EKeys",
      "site.title.specs": "Specs · EKeys",
      "site.title.docs": "Get started · EKeys",
      "site.description":
        "EKeys — an open-source 11-key ESP32-S3 macropad with rotary encoder, LCD, RGB and dual USB/BLE HID.",

      "ticker.line":
        "◆ cut & paste in one tap ◆ soft glow under every key ◆ tell your computer what to do ◆ eight scenes for eight moods ◆ made for creators, by creators ◆ open source & hackable ◆",

      "section.features.eyebrow": "01 — What it does",
      "section.features.title": "Less hunting, more creating.",
      "section.features.subtitle":
        "Stop memorizing shortcuts. Stop digging through menus. EKeys puts the things you do most right under your fingertips, with a soft glow that tells you what each one will do.",

      "features.pipeline.eyebrow": "// How a tap becomes an action",
      "features.pipeline.title": "From your fingertip to the screen.",
      "features.pipeline.desc":
        "Press a key and the signal hops through a few small stages before reaching your computer. Here’s a peek behind the curtain.",
      "features.pipeline.fig1": "FIG · 01",
      "features.pipeline.fig2": "FIG · 02",
      "features.pipeline.fig1.body":
        "[KEY MATRIX 3×4]\n      │  raw row signals\n      ▼\n[MatrixScanner]\n   debounce → key id 1..11\n      │\n      ▼\n[KeyResolver]\n   ├─ function_key\n   ├─ normal_key[]\n   └─ macros_key[]\n      │\n      ▼\n[KeyEventDispatcher]\n      │\n      ├─▶ [USB keyboard]  (USB-C cable)\n      └─▶ [Bluetooth keyboard]\n      │\n      ▼\n[Lights · Tiny screen · Logs]",
      "features.pipeline.fig2.body":
        "[YOUR COMPUTER · EKeysApp]\n      │  USB-C cable (115200 baud)\n      │  or Wi-Fi (port 30000)\n      ▼\n[Serial Protocol]\n   one JSON message per line\n   bit 7 of cmd = reply\n   seq = 0      = device pushed it\n      │\n      ▼\n[Command Registry]\n   18 simple commands:\n   • change keymap\n   • tweak a setting\n   • switch scene\n   • show device info\n   • update firmware\n   • push PC status",

      "feature.1.title": "Just plug it in",
      "feature.1.desc":
        "A USB-C cable and you’re done. It also speaks Bluetooth, so your laptop, tablet and phone can stay in sync without any extra dongles.",
      "feature.1.tags": ["USB-C", "Bluetooth", "Plug & play"],

      "feature.2.title": "Keys that mean something",
      "feature.2.desc":
        "Eleven keys, each one assigned to the thing you do most — paste, screenshot, mute, scrub the timeline, switch tool, anything you want.",
      "feature.2.tags": ["11 keys", "shortcuts", "macros"],

      "feature.3.title": "A knob you’ll actually use",
      "feature.3.desc":
        "Spin to scroll, click to confirm, double-click to go back. It feels just right for volume, timeline scrubbing or zooming in your canvas.",
      "feature.3.tags": ["rotate", "click", "feels good"],

      "feature.4.title": "A tiny screen, packed with info",
      "feature.4.desc":
        "The slim strip display shows the scene you’re in, the time, your CPU temperature, or the title of the track playing — whatever matters right now.",
      "feature.4.tags": ["color display", "live info", "glanceable"],

      "feature.5.title": "Lights that listen",
      "feature.5.desc":
        "Eleven soft-glow LEDs that pulse with your music, breathe when you’re idle, or simply light up the key you’re about to press. Choose a vibe that fits your desk.",
      "feature.5.tags": ["RGB", "music sync", "per-key"],

      "feature.6.title": "Talk to it",
      "feature.6.desc":
        "Hold one key and speak. EKeys turns your words into commands — search the web, launch an app, or send a snippet to your clipboard.",
      "feature.6.tags": ["voice control", "speech-to-text", "one tap"],

      "feature.7.title": "No internet? No problem.",
      "feature.7.desc":
        "Everything important works offline. When you do connect, EKeys can sync the time, the weather and your computer’s status straight to the little screen.",
      "feature.7.tags": ["offline", "Wi-Fi ready", "status sync"],

      "feature.8.title": "Eight scenes, one pad",
      "feature.8.desc":
        "Editing video at noon, painting at 3pm, coding at night? One tap swaps the whole keyboard to that scene. Each scene remembers its own lights, labels and screen.",
      "feature.8.tags": ["scenes", "auto-switch", "profiles"],

      "feature.9.title": "Updates without the fuss",
      "feature.9.desc":
        "New versions arrive over the air. If anything goes wrong mid-update, your current setup stays safe — no bricking, no cables, no stress.",
      "feature.9.tags": ["over-the-air", "safe updates", "set & forget"],

      "section.profiles.eyebrow": "02 — Scenes",
      "section.profiles.title": "One pad, many moments.",
      "section.profiles.subtitle":
        "Pick a scene and the keys, lights and screen rearrange themselves to match the work.",

      "profile.default.title": "Everyday",
      "profile.default.desc":
        "Cut, copy, paste, mute and screen capture — the small things that should always be one tap away.",
      "profile.default.keys": "11 KEYS · EVERYDAY",

      "profile.video.title": "Video edit",
      "profile.video.desc":
        "Scrub the timeline, slice clips, drop markers, and ripple-delete the bad takes without leaving the keyboard.",
      "profile.video.keys": "11 KEYS · VIDEO",

      "profile.design.title": "Design & paint",
      "profile.design.desc":
        "Zoom in, pick a color, switch layers. The knob feels just right for brushing across your canvas.",
      "profile.design.keys": "11 KEYS · DESIGN",

      "profile.code.title": "Code",
      "profile.code.desc":
        "Build, run, debug, format and refactor. Stop hunting for the menu — your fingers stay on the home row.",
      "profile.code.keys": "11 KEYS · CODE",

      "marquee.text":
        "open source · diy · macropad · shortcut · scene · knob · screen · light · voice · wifi ·",

      "specs.eyebrow": "03 — The bits inside",
      "specs.title": "What’s under the hood.",
      "specs.subtitle":
        "A quick look at the parts that make EKeys tick — the same list we ship with every firmware release.",

      "specs.tab.main": "Main board",
      "specs.tab.io": "Keys & ports",
      "specs.tab.rf": "Wireless & audio",

      "specs.size.eyebrow": "// Size & shape",
      "specs.size.title": "Small enough to live anywhere.",
      "specs.size.desc":
        "About the size of a deck of cards. USB-C on the back, soft-touch feet on the bottom, and a little weight to stop it sliding around.",
      "specs.size.fig.top": "FIG · 03 — TOP",
      "specs.size.fig.back": "FIG · 04 — BACK",
      "specs.size.label.knob": "KNOB",
      "specs.size.label.usbc": "USB-C",
      "specs.size.label.vent": "VENT HOLES",

      "specs.row.mcu": "Main MCU",
      "specs.row.mcu.v": "ESP32-S3 dual-core · 240 MHz",
      "specs.row.memory": "Memory",
      "specs.row.memory.v": "16 MB flash · 8 MB PSRAM",
      "specs.row.display": "Display",
      "specs.row.display.v": "Strip LCD · 428 × 142 · 16.7 M colors",
      "specs.row.lights": "Lights",
      "specs.row.lights.v": "11 per-key RGB · soft-glow under-caps",
      "specs.row.encoder": "Rotary knob",
      "specs.row.encoder.v": "Spin · click · double-click",
      "specs.row.voice": "Voice key",
      "specs.row.voice.v": "One-key speech-to-text",
      "specs.row.usb": "USB",
      "specs.row.usb.v": "USB-C · plug-and-play · no driver needed",
      "specs.row.wireless": "Wireless",
      "specs.row.wireless.v":
        "Bluetooth 5.0 · pairs with phone, tablet, laptop",
      "specs.row.wifi": "Wi-Fi",
      "specs.row.wifi.v":
        "2.4 GHz · for time, weather and status on the screen",
      "specs.row.audio.out": "Speaker",
      "specs.row.audio.out.v": "Built-in 3 W mono · click & feedback sounds",
      "specs.row.audio.in": "Microphone",
      "specs.row.audio.in.v": "Built-in · for voice key & future features",
      "specs.row.update": "Updates",
      "specs.row.update.v": "Over-the-air · safe rollback on error",
      "specs.row.app": "Companion app",
      "specs.row.app.v":
        "Windows / macOS / Linux · drag-and-drop layout editor",

      "cta.bottom.eyebrow": "04 — Make it yours",
      "cta.bottom.title": "Make it yours.",
      "cta.bottom.subtitle":
        "Every line of code, every schematic, every flashing guide is open for you to read, change and share.",
      "cta.bottom.button": "Read the guides",

      "footer.tagline":
        "A pocket-sized keyboard for people who love making things — and love their desk tidy.",
      "footer.product": "Product",
      "footer.resources": "Learn",
      "footer.community": "Community",
      "footer.copy": "© 2026 EKeys project",
      "footer.build": "v0.1.0 · static web",

      "brand.tagline": "// 11-key macro pad",

      "a11y.toggleTheme": "Toggle theme",
      "a11y.toggleLang": "Switch language",
      "a11y.openMenu": "Open menu",
      "a11y.closeMenu": "Close menu",
      "a11y.scrollTop": "Back to top",

      "docs.title": "Documentation",
      "docs.lede":
        "New to EKeys? Start here. You don’t need to be an engineer — these guides walk you through everything, from unboxing to your first custom scene.",
      "docs.nav.eyebrow": "// Index",
      "docs.nav.overview": "What is EKeys?",
      "docs.nav.build": "Set it up",
      "docs.nav.protocol": "For tinkerers",
      "docs.nav.app": "Companion app",
      "docs.nav.roadmap": "What’s coming",

      "docs.h.companion": "// Companion apps",
      "docs.p.companion.lede": "Two free, open-source apps come with EKeys:",
      "docs.p.companion.firmware":
        "<code>EKeys/</code> — the firmware that runs on the device itself.",
      "docs.p.companion.app":
        "<code>EKeysApp/</code> — a desktop app for Windows, macOS and Linux that lets you rearrange the keys, change scenes and update firmware.",
      "docs.p.companion.tail":
        "This website is a friendly tour — when you’re ready to dig deeper, the full READMEs in each project are the next step.",

      "docs.h.overview": "What is EKeys?",
      "docs.p.overview":
        "EKeys is a small 11-key pad that lives next to your keyboard. It has a knob, a tiny screen, soft-glow lights and connects to your computer over USB-C or Bluetooth. It runs open-source firmware, so you can change how it works whenever you want.",

      "docs.h.build": "Set it up",
      "docs.p.build":
        "If you bought a pre-built EKeys, just plug it in — it works out of the box. Building one yourself? These five commands will flash the firmware and load the default scenes.",
      "docs.code.build":
        "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

      "docs.h.protocol": "For tinkerers",
      "docs.p.protocol":
        'Want to build your own app that talks to EKeys? It uses a simple JSON message format over USB or Wi-Fi. Send a frame like <code>{"cmd":3,"data":{...}}</code> and the device replies. Every command is documented, and the device can be discovered on your network automatically.',

      "docs.h.app": "Companion app",
      "docs.p.app":
        "The companion app (called EKeysApp) lets you rearrange keys, change scenes and update firmware with a friendly interface. It runs on Windows, macOS and Linux. Your settings are saved automatically — no manual file editing.",

      "docs.h.roadmap": "What’s coming",
      "docs.p.roadmap":
        "We’re constantly adding small features based on what the community asks for. The short-term plan: smarter lighting scenes, longer battery life, more voice languages, and a marketplace where people can share their favorite layouts.",
    },

    zh: {
      "nav.home": "首页",
      "nav.features": "功能",
      "nav.specs": "参数",
      "nav.docs": "上手指南",
      "nav.github": "GitHub",

      "hero.eyebrow": "一块小键盘，大有来头",
      "hero.title.1": "认识 EKEYS",
      "hero.title.2": "让你的桌面更聪明",
      "hero.lede":
        "一块巴掌大小的 11 键小键盘，把你最常用的快捷键、灯效和小屏幕都放在指尖。插上就能用，切换场景就能变，专为不愿被繁琐打断的人打造。",
      "hero.cta.primary": "看看它能做什么",
      "hero.cta.secondary": "了解工作原理",
      "hero.meta.chip": "主芯片",
      "hero.meta.keys": "按键数",
      "hero.meta.link": "连接方式",
      "hero.meta.app": "配置应用",
      "hero.meta.chip.v": "ESP32-S3 · 240 MHz",
      "hero.meta.keys.v": "11 键 + 1 旋钮",
      "hero.meta.link.v": "USB-C · 蓝牙",
      "hero.device.tag": "EKEYS / V0.1",

      "site.title.home": "EKeys · 给爱折腾的人准备的小键盘",
      "site.title.features": "功能 · EKeys",
      "site.title.specs": "参数 · EKeys",
      "site.title.docs": "上手指南 · EKeys",
      "site.description":
        "EKeys —— 一块开源的 11 键 ESP32-S3 小键盘，带旋钮、彩屏、RGB 灯，同时支持 USB 和蓝牙双模连接。",

      "ticker.line":
        "◆ 一键剪切粘贴 ◆ 柔和灯效 ◆ 说出你的指令 ◆ 八种场景随心切换 ◆ 为创作者打造 ◆ 开源 & 可定制 ◆",

      "section.features.eyebrow": "01 — 它能做什么",
      "section.features.title": "少一点翻找，多一点创造。",
      "section.features.subtitle":
        "不必再记复杂的快捷键，不必再翻遍菜单。EKeys 把最常用的操作放在你指尖，柔和的灯效告诉你每个键在做什么。",

      "features.pipeline.eyebrow": "// 一次按键如何变成动作",
      "features.pipeline.title": "从指尖到屏幕。",
      "features.pipeline.desc":
        "按下按键，信号要经过几道简单的小站才到达电脑。下面带你看看背后发生了什么。",
      "features.pipeline.fig1": "图 · 01",
      "features.pipeline.fig2": "图 · 02",
      "features.pipeline.fig1.body":
        "[按键矩阵 3×4]\n      │  行列原始信号\n      ▼\n[按键扫描]\n   去抖 → 识别为 1..11 号键\n      │\n      ▼\n[键义解析]\n   ├─ 功能键\n   ├─ 普通键[]\n   └─ 宏键[]\n      │\n      ▼\n[按键派发]\n      │\n      ├─▶ [USB 键盘]  (USB-C 数据线)\n      └─▶ [蓝牙键盘]\n      │\n      ▼\n[灯光 · 小屏幕 · 日志]",
      "features.pipeline.fig2.body":
        "[你的电脑 · EKeysApp]\n      │  USB-C 数据线（115200 波特）\n      │  或 Wi-Fi（端口 30000）\n      ▼\n[串口协议]\n   一行一条 JSON 消息\n   命令字 bit 7 = 是否需要回复\n   seq = 0      = 设备主动推送\n      │\n      ▼\n[命令注册表]\n   18 条常用命令：\n   • 切换键位\n   • 调整设置\n   • 切换场景\n   • 查询设备信息\n   • 升级固件\n   • 推送电脑状态",

      "feature.1.title": "插上就能用",
      "feature.1.desc":
        "一根 USB-C 数据线就够了。它也支持蓝牙，笔记本、平板、手机都能连，不用额外买接收器。",
      "feature.1.tags": ["USB-C", "蓝牙", "即插即用"],

      "feature.2.title": "每个键都有意义",
      "feature.2.desc":
        "11 个键，每个都分配给你最常用的操作：粘贴、截图、静音、刮时间线、切换工具……想怎么设都行。",
      "feature.2.tags": ["11 键", "快捷键", "宏"],

      "feature.3.title": "旋钮手感刚刚好",
      "feature.3.desc":
        "旋转滚屏，单击确认，双击返回。调音量、刮时间线、缩放画布，每一种都很顺手。",
      "feature.3.tags": ["旋转", "点击", "手感好"],

      "feature.4.title": "小屏幕，信息满满",
      "feature.4.desc":
        "窄条屏幕告诉你当前场景、时间、CPU 温度或正在播放的歌曲——想知道的信息一眼可见。",
      "feature.4.tags": ["彩屏", "实时信息", "一眼可见"],

      "feature.5.title": "灯会听音乐",
      "feature.5.desc":
        "11 颗柔和 LED，跟着节拍闪动，闲置时缓缓呼吸，按键时点亮提示——挑一种适合你桌面的氛围。",
      "feature.5.tags": ["RGB", "音乐律动", "逐键"],

      "feature.6.title": "对它说话",
      "feature.6.desc":
        "按住一个键开口说话。EKeys 把你的话变成指令：搜索网页、打开应用、把一段话送到剪贴板。",
      "feature.6.tags": ["语音控制", "语音转文字", "一键"],

      "feature.7.title": "没网也能用",
      "feature.7.desc":
        "重要功能全部离线可用。联网时，EKeys 可以把时间、天气、电脑状态推到小屏幕上。",
      "feature.7.tags": ["离线", "Wi-Fi", "状态同步"],

      "feature.8.title": "八个场景，一个小键盘",
      "feature.8.desc":
        "中午剪视频，下午画画，晚上写代码？一按切换整套键盘。每个场景记着自己的灯光、标签和屏幕。",
      "feature.8.tags": ["场景", "自动切换", "配置"],

      "feature.9.title": "升级不用愁",
      "feature.9.desc":
        "新版本空中推送，万一出错也不会损坏当前固件——不用数据线，不用折腾。",
      "feature.9.tags": ["空中升级", "安全", "省心"],

      "section.profiles.eyebrow": "02 — 场景",
      "section.profiles.title": "一个小键盘，多种生活。",
      "section.profiles.subtitle":
        "选一个场景，按键、灯光、屏幕都会自动适配你正在做的事。",

      "profile.default.title": "日常",
      "profile.default.desc":
        "剪切、复制、粘贴、静音、截图——这些小事应该一按就到。",
      "profile.default.keys": "11 键 · 日常",

      "profile.video.title": "剪视频",
      "profile.video.desc":
        "刮时间线、裁片段、打标记、删除废素材——手不用离开小键盘。",
      "profile.video.keys": "11 键 · 视频",

      "profile.design.title": "设计与绘画",
      "profile.design.desc": "缩放、取色、切换图层。旋钮划过画布的体验刚刚好。",
      "profile.design.keys": "11 键 · 设计",

      "profile.code.title": "写代码",
      "profile.code.desc": "构建、运行、调试、格式化、重构——告别菜单里翻找。",
      "profile.code.keys": "11 键 · 代码",

      "marquee.text":
        "开源 · diy · 键盘 · 快捷 · 场景 · 旋钮 · 屏幕 · 灯光 · 语音 · wifi ·",

      "specs.eyebrow": "03 — 里面是什么",
      "specs.title": "看看里面都有什么。",
      "specs.subtitle":
        "简要列出 EKeys 的关键参数清单——和每次固件发布里的说明一致。",

      "specs.tab.main": "主控板",
      "specs.tab.io": "按键与接口",
      "specs.tab.rf": "无线与音频",

      "specs.size.eyebrow": "// 尺寸与外观",
      "specs.size.title": "小巧，放哪都不占地。",
      "specs.size.desc":
        "和一副扑克牌差不多大。背面是 USB-C 接口，底部有软胶脚垫，重量刚好不会轻易滑动。",
      "specs.size.fig.top": "图 · 03 — 正面",
      "specs.size.fig.back": "图 · 04 — 背面",
      "specs.size.label.knob": "旋钮",
      "specs.size.label.usbc": "USB-C",
      "specs.size.label.vent": "散热孔",

      "specs.row.mcu": "主芯片",
      "specs.row.mcu.v": "ESP32-S3 双核 · 240 MHz",
      "specs.row.memory": "内存",
      "specs.row.memory.v": "16 MB 闪存 · 8 MB 内存",
      "specs.row.display": "屏幕",
      "specs.row.display.v": "窄条彩屏 · 428 × 142 · 1670 万色",
      "specs.row.lights": "灯光",
      "specs.row.lights.v": "11 颗独立 RGB · 柔和透光键帽",
      "specs.row.encoder": "旋钮",
      "specs.row.encoder.v": "旋转 · 单击 · 双击",
      "specs.row.voice": "语音键",
      "specs.row.voice.v": "一键语音转文字",
      "specs.row.usb": "有线接口",
      "specs.row.usb.v": "USB-C · 即插即用 · 无需装驱动",
      "specs.row.wireless": "蓝牙",
      "specs.row.wireless.v": "蓝牙 5.0 · 手机、平板、笔记本都能连",
      "specs.row.wifi": "Wi-Fi",
      "specs.row.wifi.v": "2.4 GHz · 用于同步时间、天气、电脑状态",
      "specs.row.audio.out": "扬声器",
      "specs.row.audio.out.v": "内置 3 W 单声道 · 按键反馈音与提示",
      "specs.row.audio.in": "麦克风",
      "specs.row.audio.in.v": "内置 · 用于语音键及未来功能",
      "specs.row.update": "升级方式",
      "specs.row.update.v": "空中推送 · 失败自动回滚",
      "specs.row.app": "配置应用",
      "specs.row.app.v": "支持 Windows / macOS / Linux · 拖拽即可改键位",

      "cta.bottom.eyebrow": "04 — 把它变成你的",
      "cta.bottom.title": "把它变成你的。",
      "cta.bottom.subtitle":
        "每一行代码、每一张接线图、每一步教程都开源，欢迎阅读、修改、分享。",
      "cta.bottom.button": "查看教程",

      "footer.tagline": "为热爱创造的人准备的迷你键盘，让桌面井井有条。",
      "footer.product": "产品",
      "footer.resources": "学习",
      "footer.community": "社区",
      "footer.copy": "© 2026 EKeys 项目",
      "footer.build": "v0.1.0 · 静态网页",

      "brand.tagline": "// 11 键小键盘",

      "a11y.toggleTheme": "切换主题",
      "a11y.toggleLang": "切换语言",
      "a11y.openMenu": "打开菜单",
      "a11y.closeMenu": "关闭菜单",
      "a11y.scrollTop": "回到顶部",

      "docs.title": "上手指南",
      "docs.lede":
        "新朋友看这里。不用懂技术——从开箱到第一套自定义场景，每一步都写得很明白。",
      "docs.nav.eyebrow": "// 目录",
      "docs.nav.overview": "EKeys 是什么？",
      "docs.nav.build": "如何开始",
      "docs.nav.protocol": "写给折腾派",
      "docs.nav.app": "配套应用",
      "docs.nav.roadmap": "未来计划",

      "docs.h.companion": "// 配套项目",
      "docs.p.companion.lede": "EKeys 自带两个免费、开源的项目：",
      "docs.p.companion.firmware": "<code>EKeys/</code> —— 跑在设备上的固件。",
      "docs.p.companion.app":
        "<code>EKeysApp/</code> —— Windows / macOS / Linux 桌面应用，可以重新排列按键、切换场景、升级固件。",
      "docs.p.companion.tail":
        "本站只是一段友好导览。等你准备好深入，每个项目里的完整 README 就是下一步。",

      "docs.h.overview": "EKeys 是什么？",
      "docs.p.overview":
        "EKeys 是一块放在键盘旁边的小键盘，有 11 个键、一个旋钮、一块小屏幕和柔和灯光。它通过 USB-C 或蓝牙连接电脑，运行开源固件，你可以随时改成自己喜欢的样子。",

      "docs.h.build": "如何开始",
      "docs.p.build":
        "如果是买来的整机，插上就能用。如果是自己 DIY 的，下面这五行命令可以刷好固件并装好默认场景。",
      "docs.code.build":
        "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

      "docs.h.protocol": "写给折腾派",
      "docs.p.protocol":
        '想自己写程序和 EKeys 通信？它用一种简单的 JSON 消息格式，通过 USB 或 Wi-Fi 收发。发送形如 <code>{"cmd":3,"data":{...}}</code> 的消息，设备就会回复。每条命令都有说明，设备还能被局域网自动发现。',

      "docs.h.app": "配套应用",
      "docs.p.app":
        "配套的 EKeysApp 应用让你用友好的界面重新排列按键、切换场景、升级固件。Windows / macOS / Linux 都能用，设置会自动保存——不用手动改文件。",

      "docs.h.roadmap": "未来计划",
      "docs.p.roadmap":
        "我们会根据社区的反馈不断加入小功能。近期计划：更聪明的灯光场景、更长的电池续航、更多语音语言，以及一个让大家分享喜爱布局的市场。",
    },
  };

  function getLang() {
    const stored = localStorage.getItem(STORAGE_KEY_LANG);
    if (stored === "en" || stored === "zh") return stored;
    return (navigator.language || "en").toLowerCase().startsWith("zh")
      ? "zh"
      : "en";
  }
  function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === "light" || stored === "dark") return stored;
    try {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        return "dark";
    } catch (_) {
      /* matchMedia unavailable (very old browsers / tests) */
    }
    return "light";
  }

  function applyLang(lang) {
    document.documentElement.setAttribute(
      "lang",
      lang === "zh" ? "zh-CN" : "en",
    );
    document.documentElement.setAttribute("data-lang", lang);
    const dict = DICT[lang];
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr");
      spec.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key && dict[key] != null) el.setAttribute(attr, dict[key]);
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", DICT[getLang()]["a11y.toggleTheme"]);
    }
  }

  function applyLangPersist(lang) {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    applyLang(lang);
    const btn = document.getElementById("langToggle");
    if (btn) {
      btn.textContent = lang === "zh" ? "EN" : "中";
      btn.setAttribute("aria-label", DICT[lang]["a11y.toggleLang"]);
    }
  }

  // expose
  window.EKI18N = {
    DICT,
    getLang,
    getTheme,
    applyLang: applyLangPersist,
    applyTheme,
    toggleLang() {
      applyLangPersist(getLang() === "zh" ? "en" : "zh");
      document.documentElement.setAttribute("data-lang-ready", "true");
    },
    toggleTheme() {
      applyTheme(getTheme() === "dark" ? "light" : "dark");
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getTheme());
    applyLangPersist(getLang());
    // Tell the CSS that translations have been applied so that
    // [data-i18n] elements become visible. This must be the last step
    // so we don't reveal an English fallback frame first.
    document.documentElement.setAttribute("data-lang-ready", "true");

    const tb = document.getElementById("themeToggle");
    const lb = document.getElementById("langToggle");
    if (tb) tb.addEventListener("click", window.EKI18N.toggleTheme);
    if (lb) lb.addEventListener("click", window.EKI18N.toggleLang);

    // specs tabs (specs page)
    document.querySelectorAll("[data-specs-tabs]").forEach((group) => {
      const buttons = group.querySelectorAll("button");
      const panels = document.querySelectorAll("[data-specs-panel]");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          const target = btn.getAttribute("data-target");
          panels.forEach((p) => {
            p.hidden = p.getAttribute("data-specs-panel") !== target;
          });
        });
      });
    });

    // scroll cue
    const cue = document.getElementById("scrollCue");
    if (cue) {
      cue.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: "smooth" }),
      );
      const onScroll = () => {
        cue.classList.toggle("is-visible", window.scrollY > 600);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  });
})();
