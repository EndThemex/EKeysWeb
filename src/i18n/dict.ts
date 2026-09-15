/* EKeysWeb — 中英文本字典
   与原 assets/js/i18n.js 中的 DICT 完全一致。
   保持单数据源，方便后续扩展更多语言。 */

export type Lang = "en" | "zh";
export type Dict = Record<string, string | string[]>;

export const DICT: Record<Lang, Dict> = {
  en: {
    "nav.home": "Home",
    "nav.features": "Features",
    "nav.specs": "Specs",
    "nav.docs": "Docs",
    "nav.github": "GitHub",

    "hero.eyebrow": "an 11-key macropad, open source",
    "hero.title.1": "EKEYS",
    "hero.title.2": "A SMALL BOARD THAT DOES REAL WORK",
    "hero.lede":
      "Eleven programmable keys, a rotary encoder, a strip of color LCD and per-key backlight. EKeys plugs into your computer over USB-C or Bluetooth, runs open-source firmware, and ships ready to remap.",
    "hero.cta.primary": "see the features",
    "hero.cta.secondary": "view specs",
    "hero.meta.chip": "MCU",
    "hero.meta.keys": "Keys",
    "hero.meta.feel": "Switches",
    "hero.meta.link": "Connection",
    "hero.meta.app": "Configured by",
    "hero.meta.chip.v": "ESP32-S3 · 240 MHz dual-core",
    "hero.meta.keys.v": "11 keys · MX-style hot-swap",
    "hero.meta.feel.v": "User-replaceable",
    "hero.meta.link.v": "USB-C · Bluetooth 5.0",
    "hero.device.tag": "EKEYS / V0.1",

    "site.title.home": "EKeys · an 11-key macropad",
    "site.title.features": "Features · EKeys",
    "site.title.specs": "Specs · EKeys",
    "site.title.docs": "Docs · EKeys",
    "site.description":
      "EKeys is an 11-key macropad with a rotary encoder, a color LCD strip, per-key RGB, offline voice input and open-source firmware.",

    "ticker.line":
      "◆ 11 keys · 1 knob ◆ per-key RGB ◆ USB-C + Bluetooth ◆ 8 user scenes ◆ offline voice-to-text ◆ OTA firmware ◆ open source ◆",

    "section.features.eyebrow": "01 — features",
    "section.features.title": "what it actually does.",
    "section.features.subtitle":
      "EKeys ships with nine behaviors out of the box. Each one addresses a specific task we kept doing on a regular keyboard and wanted to do with one tap instead.",

    "features.pipeline.eyebrow": "// signal flow",
    "features.pipeline.title": "from a key press to a host action.",
    "features.pipeline.desc":
      "A key press on the board goes through several stages before it reaches the computer. The two diagrams below show the on-device path (left) and the host-to-device protocol (right).",
    "features.pipeline.fig1": "FIG · 01",
    "features.pipeline.fig2": "FIG · 02",
    "features.pipeline.fig1.body":
      "[KEY MATRIX 3×4]\n      │  raw row/column signals\n      ▼\n[Matrix scanner]\n   debounce → key id 1..11\n      │\n      ▼\n[Key resolver]\n   ├─ single function\n   ├─ key combo\n   └─ macro\n      │\n      ▼\n[Dispatcher]\n      │\n      ├─▶ [USB HID]   (USB-C)\n      └─▶ [BT HID]    (Bluetooth)\n      │\n      ▼\n[RGB · LCD · log output]",
    "features.pipeline.fig2.body":
      "[HOST · EKeysApp]\n      │  USB-C (115200 baud)\n      │  or Wi-Fi (TCP 30000 · UDP 30001)\n      ▼\n[Line protocol]\n   one JSON object per line\n   cmd bit 7 = request reply\n   seq = 0    = device-initiated\n      │\n      ▼\n[Command set · 18 entries]\n   • 0x06 push keymap\n   • 0x07 read settings\n   • 0x08 write settings\n   • 0x09 report key event\n   • 0x10 switch scene\n   • 0x11 upload scene icon\n   • 0x0B OTA firmware\n   • 0x0D PC status  /  0x0E media info",

    "feature.1.title": "USB-C and Bluetooth",
    "feature.1.desc":
      "Connect over USB-C for the lowest latency and full protocol access, or pair over Bluetooth 5.0 to use the same keymap on a laptop, tablet or phone. The device enumerates as a standard HID keyboard on both paths — no drivers required.",
    "feature.1.tags": ["USB-C", "Bluetooth 5.0", "HID"],

    "feature.2.title": "11 remappable keys",
    "feature.2.desc":
      "Each key can be bound to a single keystroke, a modifier combo, a multi-tap sequence, a text snippet or a firmware-side function. Bindings are edited in the desktop app and pushed to the device via the protocol — the on-device storage holds up to 8 keymaps.",
    "feature.2.tags": ["11 keys", "combos", "macros"],

    "feature.3.title": "Rotary encoder",
    "feature.3.desc":
      "The knob supports rotate, single press and double press. By default it drives the on-device LCD menu (scene switch, volume, brightness, status page). It can also be reassigned to emit HID events or app commands from the keymap editor.",
    "feature.3.tags": ["rotate", "press", "double-tap"],

    "feature.4.title": "Strip LCD",
    "feature.4.desc":
      "A 428×142 IPS strip displays the current scene name, Wi-Fi state, local time, music metadata (title/artist from the host) or a live CPU/RAM readout. Pages are cycled by rotating the knob. Custom pages are not yet exposed in the UI.",
    "feature.4.tags": ["428 × 142", "live data", "IPS"],

    "feature.5.title": "Per-key RGB",
    "feature.5.desc":
      "One SK6812 LED sits under each keycap. Built-in modes: solid, breathing, spectrum cycle, reactive (the pressed key lights up), and audio-reactive (follows the on-board microphone). Brightness and speed are exposed in the Lighting panel of the app.",
    "feature.5.tags": ["SK6812", "audio-reactive", "5 modes"],

    "feature.6.title": "Push-to-talk voice",
    "feature.6.desc":
      "Hold the assigned voice key, speak, release — the recognized text is typed at the cursor. Recognition uses Tencent Cloud one-shot ASR by default; Secret ID and Secret Key are entered in the app and stored locally on the device. Without Wi-Fi or valid keys, the voice key is a no-op.",
    "feature.6.tags": ["push-to-talk", "Tencent ASR", "typed at cursor"],

    "feature.7.title": "Offline by default",
    "feature.7.desc":
      "All 11 keys, the encoder, the LCD menu and the RGB effects work without any network. Wi-Fi is only used when you opt in: for NTP time sync, PC-status mirroring, or to host the OTA update endpoint. Disabling Wi-Fi does not affect key bindings.",
    "feature.7.tags": ["no Wi-Fi required", "NTP", "PC mirror"],

    "feature.8.title": "8 scenes",
    "feature.8.desc":
      "Each scene is a self-contained keymap plus an icon and a display label. The active scene can be switched from the app, from a dedicated scene-cycle key, or from the LCD menu via the encoder. Up to 8 scenes are stored in the device's flash filesystem.",
    "feature.8.tags": ["8 scenes", "per-scene icon", "hot switch"],

    "feature.9.title": "OTA updates with rollback",
    "feature.9.desc":
      "Firmware updates are delivered from the companion app: the app computes the MD5 checksum, starts a loopback-only HTTP server, and tells the device to fetch the .bin by URL. The device verifies the checksum before swapping partitions; a failed update leaves the previous firmware untouched.",
    "feature.9.tags": ["OTA", "MD5 verify", "A/B rollback"],

    "section.profiles.eyebrow": "02 — scenes",
    "section.profiles.title": "default scenes included.",
    "section.profiles.subtitle":
      "The firmware ships with four example scenes. They are starting points — edit any binding from the desktop app, or replace them entirely with your own.",

    "profile.default.title": "Everyday",
    "profile.default.desc":
      "Copy, paste, mute, screenshot, undo/redo — system-level shortcuts that are otherwise two or three key combinations deep.",
    "profile.default.keys": "11 KEYS · EVERYDAY",

    "profile.video.title": "Video edit",
    "profile.video.desc":
      "Timeline scrubbing, in/out marks, ripple delete, play/pause and the common DaVinci Resolve / Premiere shortcuts. The encoder is bound to timeline nudge.",
    "profile.video.keys": "11 KEYS · VIDEO",

    "profile.design.title": "Design",
    "profile.design.desc":
      "Zoom, brush size, undo, layer toggle, eyedropper — common Photoshop / Figma / Procreate bindings. The encoder drives zoom.",
    "profile.design.keys": "11 KEYS · DESIGN",

    "profile.code.title": "Code",
    "profile.code.desc":
      "Build, run, debug toggle, format, refactor, comment-line and the standard VS Code / JetBrains shortcuts. The encoder scrolls the editor.",
    "profile.code.keys": "11 KEYS · CODE",

    "marquee.text":
      "open source · macropad · keymap · scene · encoder · LCD · RGB · push-to-talk · OTA · ESP32 ·",

    "specs.eyebrow": "03 — specifications",
    "specs.title": "hardware specifications.",
    "specs.subtitle":
      "The same spec table is included in each firmware release notes, so values here match what the device actually reports.",

    "specs.tab.main": "board",
    "specs.tab.io": "keys & ports",
    "specs.tab.rf": "wireless & audio",

    "specs.size.eyebrow": "// size & shape",
    "specs.size.title": "dimensions.",
    "specs.size.desc":
      "Approximate footprint is 105 × 75 × 28 mm with the base attached. USB-C is centered on the rear edge. The base is a magnetic riser with three height positions; without the base the device sits at 12 mm.",
    "specs.size.fig.top": "FIG · 03 — TOP",
    "specs.size.fig.back": "FIG · 04 — BACK",
    "specs.size.label.knob": "ENCODER",
    "specs.size.label.usbc": "USB-C",
    "specs.size.label.vent": "VENT GRID",

    "specs.row.mcu": "MCU",
    "specs.row.mcu.v": "ESP32-S3 dual-core · 240 MHz",
    "specs.row.memory": "Memory",
    "specs.row.memory.v": "16 MB flash · 8 MB PSRAM",
    "specs.row.display": "Display",
    "specs.row.display.v": "428 × 142 IPS strip · 16.7 M colors",
    "specs.row.lights": "Lighting",
    "specs.row.lights.v": "11 × SK6812 RGB · under each cap",
    "specs.row.encoder": "Encoder",
    "specs.row.encoder.v": "Rotary · press · double-press",
    "specs.row.voice": "Voice key",
    "specs.row.voice.v": "Push-to-talk · typed at cursor",
    "specs.row.usb": "Wired",
    "specs.row.usb.v": "USB-C · HID keyboard · CDC 115200",
    "specs.row.wireless": "Wireless",
    "specs.row.wireless.v": "Bluetooth 5.0 HID",
    "specs.row.wifi": "Wi-Fi",
    "specs.row.wifi.v": "2.4 GHz 802.11 b/g/n · NTP · OTA",
    "specs.row.audio.out": "Speaker",
    "specs.row.audio.out.v": "3 W mono · click & feedback tones",
    "specs.row.audio.in": "Microphone",
    "specs.row.audio.in.v": "MEMS digital mic · used by ASR and audio-reactive RGB",
    "specs.row.update": "Updates",
    "specs.row.update.v": "OTA via local HTTP · MD5 verified · A/B partitions",
    "specs.row.app": "Companion app",
    "specs.row.app.v": "EKeysApp · Windows / macOS / Linux · Rust + egui",

    "cta.bottom.eyebrow": "04 — open source",
    "cta.bottom.title": "firmware, schematics, app — all public.",
    "cta.bottom.subtitle":
      "Both the on-device firmware (EKeys/) and the desktop app (EKeysApp/) live on GitHub under permissive licenses. Schematics and the BoM are in the hardware/ folder of the firmware repo.",
    "cta.bottom.button": "open the docs",

    "footer.tagline":
      "An 11-key macropad project. Firmware, desktop app and hardware are open source.",
    "footer.product": "Project",
    "footer.resources": "Learn",
    "footer.community": "Community",
    "footer.copy": "© 2026 the EKeys project",
    "footer.build": "v0.1.0 · static web",

    "brand.tagline": "// 11-key macropad",

    "a11y.toggleTheme": "toggle theme",
    "a11y.toggleLang": "switch language",
    "a11y.openMenu": "open menu",
    "a11y.closeMenu": "close menu",
    "a11y.scrollTop": "back to top",

    "docs.title": "documentation",
    "docs.lede":
      "Everything you need to put EKeys to work: the device overview, firmware flashing, the four core flows in the desktop app, the line protocol, and what is on the roadmap.",
    "docs.nav.eyebrow": "// index",
    "docs.nav.overview": "overview",
    "docs.nav.build": "flashing firmware",
    "docs.nav.protocol": "line protocol",
    "docs.nav.app": "desktop app",
    "docs.nav.roadmap": "roadmap",

    "docs.h.companion": "// repositories",
    "docs.p.companion.lede": "The project ships as two repositories:",
    "docs.p.companion.firmware":
      "<code>EKeys/</code> — the on-device firmware, built with PlatformIO for ESP32-S3.",
    "docs.p.companion.app":
      "<code>EKeysApp/</code> — the desktop companion app for Windows, macOS and Linux, written in Rust with egui.",
    "docs.p.companion.tail":
      "This page is a high-level summary. Each repository has a full README, a build script, and a /docs folder with the detailed references.",

    "docs.h.overview": "overview",
    "docs.p.overview":
      "EKeys is a USB-C / Bluetooth 11-key macropad built around an ESP32-S3. It exposes 11 MX-style hot-swap keys, a rotary encoder, a 428×142 IPS strip, 11 SK6812 LEDs and a MEMS microphone. The firmware is written in C/C++ on top of Arduino/ESP-IDF, and the host-side app is Rust. Both are open source.",

    "docs.h.build": "flashing firmware",
    "docs.p.build":
      "Pre-built units ship with firmware already flashed. To rebuild from source, install PlatformIO and run the four commands below: the first compiles, the second writes firmware, the third writes the on-device filesystem (default scenes, icons, audio), and the fourth opens a serial monitor at 115200 baud.",
    "docs.code.build":
      "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

    "docs.h.protocol": "line protocol",
    "docs.p.protocol":
      'The device speaks a line-delimited JSON protocol on the USB CDC port at 115200 baud, and over TCP/UDP on the Wi-Fi interface. Each line is one object: <code>{"cmd":3,"data":{...},"seq":N}</code>. The high bit of <code>cmd</code> marks a request that expects a reply. <code>seq=0</code> indicates a device-pushed frame. The full command set is documented in <code>EKeys/docs/protocol.md</code>.',

    "docs.h.app": "desktop app",
    "docs.p.app":
      "EKeysApp is the desktop tool used to edit keymaps, manage scenes, configure Wi-Fi and trigger OTA updates. It runs on Windows, macOS and Linux. The app talks to the device over the same JSON protocol; UI changes are staged locally and only sent to the device when you press Apply.",

    "docs.h.roadmap": "roadmap",
    "docs.p.roadmap":
      "Public roadmap items under active development: per-scene RGB presets, lower idle power draw, additional ASR languages, and a community layout registry. Items are tracked as GitHub issues with the <code>roadmap</code> label — vote or comment there if a feature matters to you.",

    /* ---------------- Companion app sections ---------------- */
    "nav.app": "App",
    "app.hero.eyebrow": "open source · runs on Windows / macOS / Linux",
    "app.hero.title.1": "EKEYS APP",
    "app.hero.title.2": "DESKTOP COMPANION FOR EKEYS",
    "app.hero.lede":
      "A Rust desktop app that communicates with EKeys over USB. It is used to edit keymaps, manage scenes, configure RGB and audio, view logs and push firmware updates. Communication goes through the same line protocol the firmware exposes.",
    "app.hero.cta.primary": "see all panels",
    "app.hero.cta.secondary": "view protocol docs",
    "app.hero.meta.lang": "Stack",
    "app.hero.meta.lang.v": "Rust · egui · serde",
    "app.hero.meta.platform": "Platforms",
    "app.hero.meta.platform.v": "Windows / macOS / Linux",
    "app.hero.meta.link": "Transport",
    "app.hero.meta.link.v": "USB CDC · 115200 baud",
    "app.hero.device.tag": "EKEYS APP / V0.1",

    "app.section.principles.eyebrow": "01 — design principles",
    "app.section.principles.title": "design principles.",
    "app.section.principles.subtitle":
      "Six rules the UI follows. They explain why the panels look the way they do, and why some features behave differently from a typical config tool.",

    "app.principle.1.title": "Status first",
    "app.principle.1.desc":
      "Connection state, snapshot arrival and outgoing writes are visible at all times: a status pill in the sidebar, a transient toast, and a line in the log. You should never wonder whether the device has the latest config.",

    "app.principle.2.title": "Shortest path",
    "app.principle.2.desc":
      "From app launch to first saved config is four clicks or fewer. Any extra step is treated as a UX bug and filed against the relevant panel.",

    "app.principle.3.title": "Edits are drafts",
    "app.principle.3.desc":
      "UI changes stay local until you press Apply. The diff preview at the bottom of each panel shows exactly which fields will be written. Discarding a draft is one keystroke (Esc).",

    "app.principle.4.title": "Logs by color",
    "app.principle.4.desc":
      "Protocol frames, firmware output and app output use distinct colors. A quick glance at the Log panel tells you which subsystem produced each line.",

    "app.principle.5.title": "Forward-compatible",
    "app.principle.5.desc":
      "When the firmware adds new fields, the app ignores them rather than crashing. Unknown JSON keys are dropped silently and noted in the log so you can see what was skipped.",

    "app.principle.6.title": "Keyboard friendly",
    "app.principle.6.desc":
      "Every panel can be operated without a mouse: Tab moves focus, F5 re-pulls the snapshot, Ctrl+Enter applies pending changes, Esc discards them, Ctrl+1 through Ctrl+8 switch panels.",

    "app.section.panels.eyebrow": "02 — panels",
    "app.section.panels.title": "nine panels in the sidebar.",
    "app.section.panels.subtitle":
      "Each sidebar entry is one panel that does one thing. Pick the panel that matches what you want to change.",

    "app.panel.connect.title": "Connection",
    "app.panel.connect.desc":
      "Selects the serial port, opens it at 115200 baud and runs the handshake. The last-used port and the auto-connect preference are persisted in the OS-specific config directory.",
    "app.panel.connect.bullets":
      "Filtered port list (EKeys identifiers only)\nAuto-reconnect on USB hot-plug\nRemembers last port + auto-connect toggle\nStatus block shows last handshake, heartbeat and any errors",
    "app.panel.connect.tags": ["USB CDC", "auto-reconnect", "persistent"],

    "app.panel.settings.title": "Device settings",
    "app.panel.settings.desc":
      "Six tabs: Display, Keyboard, Audio, Power, PC status and Firmware. Each field is independent — the panel tracks a per-field dirty state and the diff bar at the bottom shows exactly what Apply will write.",
    "app.panel.settings.bullets":
      "Six tabs covering all 26 configurable fields\nPer-field clamps matching the firmware's validation rules\nSecret fields (Wi-Fi password, ASR keys) are masked in the UI\nDiff preview bar shows only changed fields",
    "app.panel.settings.tags": ["26 fields", "diff preview", "masked"],

    "app.panel.keymap.title": "Keymap editor",
    "app.panel.keymap.desc":
      "A visual representation of the 11 keys plus the encoder, with two FUN modifier layers. Click a position to open its binding drawer on the right; the draft updates live as you edit.",
    "app.panel.keymap.bullets":
      "11 keys + 1 encoder rendered to scale\nBinding types: key, combo, multi-press, text snippet, firmware function\nTwo FUN layers with per-position overrides\nDiff preview lists every binding change before it is sent",
    "app.panel.keymap.tags": ["11 keys", "FUN layers", "visual"],

    "app.panel.lighting.title": "Lighting",
    "app.panel.lighting.desc":
      "Controls the 11 SK6812 LEDs. Five built-in modes (solid, breathing, spectrum, reactive, audio-reactive), a color picker, brightness slider, and animation speed.",
    "app.panel.lighting.bullets":
      "Five modes: solid, breathing, spectrum, reactive, audio-reactive\nHSV color picker + brightness slider\nReactive intensity and idle animation speed\nAudio-reactive mode uses the on-board MEMS microphone",
    "app.panel.lighting.tags": ["SK6812", "audio-reactive", "HSV"],

    "app.panel.wifi.title": "Wi-Fi & time",
    "app.panel.wifi.desc":
      "Stores the Wi-Fi SSID and password on the device, picks which host computer to mirror, and falls back to public NTP when no host is selected.",
    "app.panel.wifi.bullets":
      "SSID + password (password is masked after entry)\nHost picker for PC-status mirroring\nNTP fallback when no host is configured\nMasking behavior matches the protocol specification",
    "app.panel.wifi.tags": ["2.4 GHz", "NTP", "PC mirror"],

    "app.panel.audio.title": "Sound pad",
    "app.panel.audio.desc":
      "Manages up to 11 audio files stored on the device's flash filesystem. Files are uploaded through the protocol, each slot is bound to one of the 11 keys, and Try-play previews the file without changing its binding.",
    "app.panel.audio.bullets":
      "Drag-and-drop upload with live progress and cancel\n11-slot binding list + on-device file browser\nStorage usage read back from the device\nTry-play does not modify the binding",
    "app.panel.audio.tags": ["≤ 2 MB / file", "MP3 / WAV", "11 slots"],

    "app.panel.voice.title": "Speech-to-text",
    "app.panel.voice.desc":
      "Configures the push-to-talk voice key: trigger key selection, maximum recording length, ASR provider, and credentials. Credentials are stored on the device and masked in the UI.",
    "app.panel.voice.bullets":
      "Trigger key (1–11) + maximum recording length\nASR provider: Tencent Cloud one-shot\nSecret ID and Secret Key are masked in the UI\nOptional auto-enter ASR mode",
    "app.panel.voice.tags": ["push-to-talk", "Tencent ASR", "stored locally"],

    "app.panel.log.title": "Log",
    "app.panel.log.desc":
      "Three colored streams (protocol TX, protocol RX, firmware output, app output) shown in a single scrollable view. Filter by source and level, search by text, follow the tail.",
    "app.panel.log.bullets":
      "Protocol TX (blue), RX (green), firmware (gray), app (white)\nFilter by category and minimum level, plus full-text search\nAuto-follow tail; click to pause\n5000-entry ring buffer",
    "app.panel.log.tags": ["4 streams", "search", "ring buffer"],

    "app.panel.firmware.title": "Firmware update",
    "app.panel.firmware.desc":
      "Selects a .bin, computes its MD5 checksum, starts a loopback-only HTTP server, and instructs the device to fetch the file. The device verifies the checksum before switching to the new partition.",
    "app.panel.firmware.bullets":
      "Loopback-only HTTP server (127.0.0.1)\nMD5 checksum verified by the device\nProgress bar + status messages live in the panel\nA failed update leaves the previous partition untouched",
    "app.panel.firmware.tags": ["OTA", "MD5", "A/B"],

    "app.section.shortcuts.eyebrow": "03 — keyboard shortcuts",
    "app.section.shortcuts.title": "keyboard shortcuts.",
    "app.section.shortcuts.subtitle":
      "Every panel is reachable without a mouse.",

    "app.shortcut.f5": "Re-pull the full config snapshot from the device",
    "app.shortcut.ctrlEnter": "Apply pending changes",
    "app.shortcut.esc": "Discard pending changes",
    "app.shortcut.ctrlL": "Open the Log panel",
    "app.shortcut.ctrl1": "Open Device settings",
    "app.shortcut.ctrl2": "Open Keymap editor",
    "app.shortcut.ctrl3": "Open Lighting",
    "app.shortcut.ctrl4": "Open Wi-Fi & time",
    "app.shortcut.ctrl5": "Open Sound pad",
    "app.shortcut.ctrl6": "Open Speech-to-text",
    "app.shortcut.ctrl7": "Open Log",
    "app.shortcut.ctrl8": "Open About",

    "app.cta.eyebrow": "04 — source",
    "app.cta.title": "source on GitHub.",
    "app.cta.subtitle":
      "The app is in the EKeysApp/ repository: Rust source, egui panels, protocol client, and CI builds for all three platforms.",
    "app.cta.button": "open repository",

    /* ---------------- Extended docs sections ---------------- */
    "docs.nav.connect": "Connection",
    "docs.nav.keymap": "Keymap editor",
    "docs.nav.audio": "Sound pad",
    "docs.nav.firmware": "Firmware update",

    "docs.h.connect": "connection flow",
    "docs.p.connect":
      "Clicking Connect selects the first EKeys serial port, opens it at 115200 baud and runs the handshake. On success the app pulls the device information, the full settings snapshot, the scene list and the sound bindings. All panels are populated from that initial fetch.",
    "docs.steps.connect": [
      "Open the USB CDC port at 115200 baud",
      "Sync the host clock and timezone to the device",
      "Read device info (name, serial number, firmware version)",
      "Pull the full settings snapshot",
      "Load the scene list and the currently active scene",
      "Refresh the sound pad bindings",
      "Start a 1 Hz heartbeat and mark the connection as Online",
    ],

    "docs.h.keymap": "keymap editor in depth",
    "docs.p.keymap":
      "Click any position on the visual board to open its drawer. Pick a binding type (key, combo, multi-press, text snippet, firmware function), edit the parameters and the draft updates in place. Apply computes the smallest set of changes and sends only those fields to the device.",
    "docs.steps.keymap": [
      "Click a position on the visual board",
      "Choose a binding type in the drawer (key / combo / multi-press / text / function)",
      "Edit parameters — the draft updates as you type",
      "Optionally assign FUN-1 or FUN-2 modifiers for layered behavior",
      "Review the diff preview at the bottom of the panel",
      "Press Apply (Ctrl+Enter) to send only the changed bindings",
      "A green ACK in the Log panel confirms the snapshot was updated",
    ],

    "docs.h.audio": "sound pad in depth",
    "docs.p.audio":
      "The Sound Pad panel manages up to 11 audio slots stored on the device's flash filesystem. Drag a file in, name it according to the firmware's filename rules (<code>a-z 0-9 _ + .mp3 / .wav</code>), and the upload progress is shown live. Any key can be bound to any file; Try-play previews without changing the binding.",
    "docs.steps.audio": [
      "Open the Sound Pad panel",
      "Drag a file (≤ 2 MB) into the upload area or pick one from disk",
      "Choose a device-side filename (or accept the auto-generated name)",
      "Click Upload — progress is live; Cancel aborts the transfer",
      "Bind keys 1–11 to files from the dropdowns",
      "Click Try-play to preview, or press the bound key on the device",
    ],

    "docs.h.firmware": "firmware update flow",
    "docs.p.firmware":
      "Updates are OTA. Select a <code>.bin</code>, the app computes its MD5 checksum, starts a loopback HTTP server, and tells the device to fetch the file. The device verifies the checksum before swapping to the new partition. The device never opens an inbound port.",
    "docs.steps.firmware": [
      "Select a .bin from the Firmware tab",
      "The app computes the MD5 and starts a loopback HTTP server",
      "The device is given the URL and the expected checksum",
      "The device downloads the file, verifies it, and reboots into the new partition",
      "A failure at any step leaves the running firmware untouched",
    ],
  },

  zh: {
    "nav.home": "首页",
    "nav.features": "功能",
    "nav.specs": "参数",
    "nav.docs": "文档",
    "nav.github": "GitHub",

    "hero.eyebrow": "11 键宏键盘，开源固件",
    "hero.title.1": "EKEYS",
    "hero.title.2": "个性化、自定义的小巧键盘",
    "hero.lede":
      "11 个可编程按键、一颗旋转编码器、一条彩色的窄条 LCD、每键独立背光。EKeys 通过 USB-C 或蓝牙连接电脑，运行开源固件，出厂即可自定义键位。",
    "hero.cta.primary": "查看功能",
    "hero.cta.secondary": "看参数表",
    "hero.meta.chip": "主控",
    "hero.meta.keys": "按键",
    "hero.meta.feel": "键轴",
    "hero.meta.link": "连接",
    "hero.meta.app": "配置工具",
    "hero.meta.chip.v": "ESP32-S3 · 双核 240 MHz",
    "hero.meta.keys.v": "11 键 · MX 规格热插拔",
    "hero.meta.feel.v": "用户自更换",
    "hero.meta.link.v": "USB-C · 蓝牙 5.0",
    "hero.device.tag": "EKEYS / V0.1",

    "site.title.home": "EKeys · 11 键宏键盘",
    "site.title.features": "功能 · EKeys",
    "site.title.specs": "参数 · EKeys",
    "site.title.docs": "文档 · EKeys",
    "site.description":
      "EKeys 是一款 11 键宏键盘,带旋转编码器、窄条彩色 LCD、每键 RGB、离线语音转文字和开源固件。",

    "ticker.line":
      "◆ 11 键 · 1 旋钮 ◆ 每键 RGB ◆ USB-C + 蓝牙 ◆ 8 个用户场景 ◆ 离线语音转文字 ◆ OTA 升级 ◆ 开源 ◆",

    "section.features.eyebrow": "01 — 功能",
    "section.features.title": "实际能做的事。",
    "section.features.subtitle":
      "EKeys 出厂自带 9 项行为，每一项都对应一个原本要在普通键盘上做两三步组合键的动作，把它们压成一个键。",

    "features.pipeline.eyebrow": "// 信号流",
    "features.pipeline.title": "从按键到主机动作。",
    "features.pipeline.desc":
      "按下键后，信号要经过几道处理才到达电脑。下面两张图分别是设备内部路径（左）和主机↔设备的通信协议（右）。",
    "features.pipeline.fig1": "图 · 01",
    "features.pipeline.fig2": "图 · 02",
    "features.pipeline.fig1.body":
      "[按键矩阵 3×4]\n      │  行列原始电平\n      ▼\n[矩阵扫描]\n   去抖 → 得出 1~11 号键\n      │\n      ▼\n[键义解析]\n   ├─ 单个功能\n   ├─ 组合键\n   └─ 宏\n      │\n      ▼\n[派发器]\n      │\n      ├─▶ [USB HID]  (USB-C)\n      └─▶ [BT HID]   (蓝牙)\n      │\n      ▼\n[RGB · LCD · 日志输出]",
    "features.pipeline.fig2.body":
      "[主机 · EKeysApp]\n      │  USB-C（115200 波特）\n      │  或 Wi-Fi（TCP 30000 · UDP 30001）\n      ▼\n[行协议]\n   一行一个 JSON 对象\n   cmd bit 7 = 是否需要回复\n   seq = 0   = 设备主动推送\n      │\n      ▼\n[命令集 · 共 18 条]\n   • 0x06 下发键位\n   • 0x07 读取设置\n   • 0x08 写入设置\n   • 0x09 上报按键事件\n   • 0x10 切换场景\n   • 0x11 上传场景图标\n   • 0x0B OTA 升级固件\n   • 0x0D 电脑状态  /  0x0E 媒体信息",

    "feature.1.title": "USB-C 与蓝牙双连接",
    "feature.1.desc":
      "USB-C 提供最低延迟和完整协议访问；蓝牙 5.0 让同一套键位在笔记本、平板、手机上都能用。两种路径下设备都枚举为标准 HID 键盘，无需安装驱动。",
    "feature.1.tags": ["USB-C", "蓝牙 5.0", "HID"],

    "feature.2.title": "11 个可重映射按键",
    "feature.2.desc":
      "每个键可绑定到单个按键、修饰键组合、多键序列、文本片段或固件内置功能。绑定在桌面 App 里编辑并通过协议推送到设备，设备侧闪存最多保存 8 套键位。",
    "feature.2.tags": ["11 键", "组合键", "宏"],

    "feature.3.title": "旋转编码器",
    "feature.3.desc":
      "旋钮支持旋转、单按和双击。默认驱动设备 LCD 菜单（切场景、调音量、调亮度、翻状态页），也可以在键位编辑器里把它重映射为 HID 事件或 App 命令。",
    "feature.3.tags": ["旋转", "点按", "双击"],

    "feature.4.title": "窄条 LCD",
    "feature.4.desc":
      "428 × 142 IPS 窄条屏幕显示当前场景名、Wi-Fi 状态、本地时间、主机音乐元数据（标题/歌手）或实时 CPU/内存占用。旋转旋钮在不同页面间切换。UI 暂未开放自定义页面。",
    "feature.4.tags": ["428 × 142", "实时数据", "IPS"],

    "feature.5.title": "每键独立 RGB",
    "feature.5.desc":
      "每颗键帽下放一颗 SK6812 LED。内置模式：常亮、呼吸、彩虹循环、按键高亮（按下时点亮）、音频律动（跟随板载麦克风）。亮度与速度在 App 灯效面板里调整。",
    "feature.5.tags": ["SK6812", "音频律动", "5 种模式"],

    "feature.6.title": "按住说话式语音",
    "feature.6.desc":
      "按住指定的语音键说话、松开即停止，识别结果会输入到当前光标处。默认使用腾讯云一句话识别；Secret ID 与 Secret Key 在 App 里填写，本地保存到设备。没有 Wi-Fi 或有效密钥时，语音键无效。",
    "feature.6.tags": ["按住说话", "腾讯 ASR", "光标处输入"],

    "feature.7.title": "默认离线工作",
    "feature.7.desc":
      "11 个按键、旋钮、LCD 菜单和 RGB 效果都不需要网络。Wi-Fi 仅在你主动启用时使用：NTP 校时、镜像电脑状态或作为 OTA 升级的拉取端。关闭 Wi-Fi 不会影响按键绑定。",
    "feature.7.tags": ["无需 Wi-Fi", "NTP", "PC 镜像"],

    "feature.8.title": "8 个场景",
    "feature.8.desc":
      "每个场景是独立的键位 + 图标 + 显示标签。可在 App、专用切换键或旋钮驱动的 LCD 菜单中切换。设备闪存最多保存 8 个场景。",
    "feature.8.tags": ["8 个场景", "每场景独立图标", "即时切换"],

    "feature.9.title": "OTA 升级与回滚",
    "feature.9.desc":
      "固件由配套 App 推送：App 计算 MD5 校验和、启动一个仅回环的 HTTP 服务，再让设备按 URL 拉取 .bin。设备在校验通过后才切换分区；任何失败都会保留原固件。",
    "feature.9.tags": ["OTA", "MD5 校验", "A/B 回滚"],

    "section.profiles.eyebrow": "02 — 场景",
    "section.profiles.title": "出厂自带 4 个场景。",
    "section.profiles.subtitle":
      "固件中预置 4 个示例场景。它们只是起点——所有绑定都能在桌面 App 里改写或整组替换。",

    "profile.default.title": "日常",
    "profile.default.desc":
      "复制、粘贴、静音、截图、撤销/重做——这些在普通键盘上要走两到三步组合键的系统级快捷键。",
    "profile.default.keys": "11 键 · 日常",

    "profile.video.title": "视频剪辑",
    "profile.video.desc":
      "时间线刮擦、入出点、波形删除、播放/暂停，以及常用的 DaVinci Resolve / Premiere 快捷键。旋钮绑定为时间线微调。",
    "profile.video.keys": "11 键 · 视频",

    "profile.design.title": "设计",
    "profile.design.desc":
      "缩放、笔刷大小、撤销、图层切换、取色器——常用的 Photoshop / Figma / Procreate 快捷键。旋钮驱动缩放。",
    "profile.design.keys": "11 键 · 设计",

    "profile.code.title": "代码",
    "profile.code.desc":
      "构建、运行、调试开关、格式化、重构、注释行——标准的 VS Code / JetBrains 快捷键。旋钮滚动编辑器。",
    "profile.code.keys": "11 键 · 代码",

    "marquee.text":
      "开源 · 宏键盘 · 键位 · 场景 · 旋钮 · LCD · RGB · 语音 · OTA · ESP32 ·",

    "specs.eyebrow": "03 — 参数",
    "specs.title": "硬件参数。",
    "specs.subtitle":
      "下方参数表与每次固件发版说明保持一致，数值与设备实际报告一致。",

    "specs.tab.main": "主板",
    "specs.tab.io": "按键与接口",
    "specs.tab.rf": "无线与音频",

    "specs.size.eyebrow": "// 尺寸外观",
    "specs.size.title": "尺寸。",
    "specs.size.desc":
      "含底座时整机尺寸约 105 × 75 × 28 mm。USB-C 居中布置在后侧边缘。底座为磁吸增高架，3 段高度可调；不带底座时厚度 12 mm。",
    "specs.size.fig.top": "图 · 03 — 正面",
    "specs.size.fig.back": "图 · 04 — 背面",
    "specs.size.label.knob": "编码器",
    "specs.size.label.usbc": "USB-C",
    "specs.size.label.vent": "散热栅",

    "specs.row.mcu": "主控",
    "specs.row.mcu.v": "ESP32-S3 双核 · 240 MHz",
    "specs.row.memory": "存储",
    "specs.row.memory.v": "16 MB Flash · 8 MB PSRAM",
    "specs.row.display": "屏幕",
    "specs.row.display.v": "428 × 142 IPS 窄条 · 1670 万色",
    "specs.row.lights": "灯效",
    "specs.row.lights.v": "11 × SK6812 RGB · 键帽下",
    "specs.row.encoder": "编码器",
    "specs.row.encoder.v": "旋转 · 点按 · 双击",
    "specs.row.voice": "语音键",
    "specs.row.voice.v": "按住说话 · 光标处输入",
    "specs.row.usb": "有线",
    "specs.row.usb.v": "USB-C · HID 键盘 · CDC 115200",
    "specs.row.wireless": "无线",
    "specs.row.wireless.v": "蓝牙 5.0 HID",
    "specs.row.wifi": "Wi-Fi",
    "specs.row.wifi.v": "2.4 GHz 802.11 b/g/n · NTP · OTA",
    "specs.row.audio.out": "扬声器",
    "specs.row.audio.out.v": "3 W 单声道 · 按键音与提示音",
    "specs.row.audio.in": "麦克风",
    "specs.row.audio.in.v": "MEMS 数字麦 · 用于 ASR 与音频律动",
    "specs.row.update": "升级",
    "specs.row.update.v": "OTA 经本地 HTTP · MD5 校验 · A/B 分区",
    "specs.row.app": "配套 App",
    "specs.row.app.v": "EKeysApp · Windows / macOS / Linux · Rust + egui",

    "cta.bottom.eyebrow": "04 — 开源",
    "cta.bottom.title": "固件、原理图、App 全部公开。",
    "cta.bottom.subtitle":
      "设备固件 (EKeys/) 和桌面 App (EKeysApp/) 都放在 GitHub 上，使用宽松开源许可。原理图与物料清单在固件仓库的 hardware/ 目录里。",
    "cta.bottom.button": "看文档",

    "footer.tagline":
      "一个 11 键宏键盘项目。固件、桌面 App 和硬件资料均开源。",
    "footer.product": "项目",
    "footer.resources": "学习",
    "footer.community": "社区",
    "footer.copy": "© 2026 EKeys 项目",
    "footer.build": "v0.1.0 · 静态网页",

    "brand.tagline": "// 11 键宏键盘",

    "a11y.toggleTheme": "换主题",
    "a11y.toggleLang": "换语言",
    "a11y.openMenu": "打开菜单",
    "a11y.closeMenu": "关闭菜单",
    "a11y.scrollTop": "回到顶部",

    "docs.title": "文档",
    "docs.lede":
      "本页收录 EKeys 用到的全部说明：设备概览、固件烧录、桌面 App 的四个核心流程、通信协议，以及公开路线图。",
    "docs.nav.eyebrow": "// 目录",
    "docs.nav.overview": "设备概览",
    "docs.nav.build": "烧录固件",
    "docs.nav.protocol": "行协议",
    "docs.nav.app": "桌面 App",
    "docs.nav.roadmap": "路线图",

    "docs.h.companion": "// 仓库",
    "docs.p.companion.lede": "项目拆分成两个仓库：",
    "docs.p.companion.firmware":
      "<code>EKeys/</code> —— 设备端固件，基于 PlatformIO 面向 ESP32-S3。",
    "docs.p.companion.app":
      "<code>EKeysApp/</code> —— 桌面配套 App，支持 Windows / macOS / Linux，用 Rust + egui 编写。",
    "docs.p.companion.tail":
      "本页是高阶摘要。每个仓库都有自己的 README、构建脚本和 /docs 目录，里面有详细的参考。",

    "docs.h.overview": "设备概览",
    "docs.p.overview":
      "EKeys 是一款基于 ESP32-S3 的 11 键宏键盘，支持 USB-C 与蓝牙双连接。硬件上含 11 个 MX 规格热插拔按键、一颗旋转编码器、一块 428×142 IPS 窄条 LCD、11 颗 SK6812 LED 和一颗 MEMS 麦克风。固件使用 C/C++ 编写，运行在 Arduino/ESP-IDF 之上；主机侧 App 用 Rust 编写。两者均开源。",

    "docs.h.build": "烧录固件",
    "docs.p.build":
      "量产机型出厂已烧录固件。从源码自行编译需要先安装 PlatformIO，再依次运行下面 4 条命令：第一条编译，第二条写入固件，第三条写入设备侧文件系统（默认场景、图标、音效），第四条打开 115200 波特率的串口监视器。",
    "docs.code.build":
      "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

    "docs.h.protocol": "行协议",
    "docs.p.protocol":
      '设备在 USB CDC（115200 波特）和 Wi-Fi（TCP/UDP）上对外提供行分隔的 JSON 协议。每一行是一个对象：<code>{"cmd":3,"data":{...},"seq":N}</code>。<code>cmd</code> 的高比特位标记「需要回复」。<code>seq=0</code> 表示这一帧是设备主动推送的。完整的命令集合在 <code>EKeys/docs/protocol.md</code>。',

    "docs.h.app": "桌面 App",
    "docs.p.app":
      "EKeysApp 是用于编辑键位、管理场景、配置 Wi-Fi 和推送 OTA 升级的桌面工具。运行于 Windows / macOS / Linux。App 通过同一套 JSON 协议与设备通信；UI 上的改动先在本地暂存，按 Apply 才下发到设备。",

    "docs.h.roadmap": "路线图",
    "docs.p.roadmap":
      "目前公开规划中正在做的：每场景独立 RGB 预设、更低的待机功耗、更多 ASR 语言支持、社区键位注册表。所有路线图项都以 <code>roadmap</code> 标签记录为 GitHub issue——对某项功能感兴趣可以在对应 issue 下投票或评论。",

    /* ---------------- 配套桌面 App 介绍 ---------------- */
    "nav.app": "App",
    "app.hero.eyebrow": "开源 · 支持 Windows / macOS / Linux",
    "app.hero.title.1": "EKEYS APP",
    "app.hero.title.2": "EKEYS 的桌面配套应用",
    "app.hero.lede":
      "用 Rust 编写的桌面应用，通过 USB 与 EKeys 通信。可用于编辑键位、管理场景、配置 RGB 与音频、查看日志和推送固件更新。通信走的是固件提供的同一套行协议。",
    "app.hero.cta.primary": "查看全部面板",
    "app.hero.cta.secondary": "看协议文档",
    "app.hero.meta.lang": "技术栈",
    "app.hero.meta.lang.v": "Rust · egui · serde",
    "app.hero.meta.platform": "支持系统",
    "app.hero.meta.platform.v": "Windows / macOS / Linux",
    "app.hero.meta.link": "通信方式",
    "app.hero.meta.link.v": "USB CDC · 115200 波特",
    "app.hero.device.tag": "EKEYS APP / V0.1",

    "app.section.principles.eyebrow": "01 — 设计原则",
    "app.section.principles.title": "设计原则。",
    "app.section.principles.subtitle":
      "UI 遵循的 6 条规则。解释了面板为何长成现在这样，以及部分功能为何和常见的配置工具不太一样。",

    "app.principle.1.title": "状态优先",
    "app.principle.1.desc":
      "连接状态、快照到达、外发写入始终可见：侧栏有状态指示灯、有临时气泡、日志里有对应一行。任何时候都不必猜测设备拿到的是不是最新配置。",

    "app.principle.2.title": "路径最短",
    "app.principle.2.desc":
      "从打开 App 到第一次保存配置，点击不超过 4 次。多出来的每一步都算 UX bug，归档到对应面板。",

    "app.principle.3.title": "改动皆草稿",
    "app.principle.3.desc":
      "UI 上的修改只先保留在本地。每个面板底部的 diff 预览会列出 Apply 时会写哪些字段。按 Esc 一次即可丢弃草稿。",

    "app.principle.4.title": "日志按色分流",
    "app.principle.4.desc":
      "协议帧、固件输出、App 输出用不同颜色区分。看一眼日志面板就知道每行来自哪个子系统。",

    "app.principle.5.title": "向前兼容",
    "app.principle.5.desc":
      "固件增加新字段时，App 不崩溃而是忽略。无法识别的 JSON 键静默丢弃并在日志中记一行，方便看到跳过了什么。",

    "app.principle.6.title": "键盘友好",
    "app.principle.6.desc":
      "每个面板都能脱离鼠标使用：Tab 切换焦点，F5 重新拉取快照，Ctrl+Enter 应用改动，Esc 丢弃改动，Ctrl+1 到 Ctrl+8 切换面板。",

    "app.section.panels.eyebrow": "02 — 面板",
    "app.section.panels.title": "侧栏共 9 个面板。",
    "app.section.panels.subtitle":
      "侧栏的每一项就是一个面板，每个面板只做一件事。想改什么就进哪个面板。",

    "app.panel.connect.title": "连接",
    "app.panel.connect.desc":
      "选择串口、以 115200 波特打开并执行握手。最近使用过的端口和自动连接选项保存在操作系统对应的配置目录里。",
    "app.panel.connect.bullets":
      "经过过滤的端口列表（仅显示 EKeys 标识）\nUSB 热插拔时自动重连\n记住上次端口 + 自动连接开关\n状态区显示最近一次握手、心跳和错误",
    "app.panel.connect.tags": ["USB CDC", "自动重连", "持久化"],

    "app.panel.settings.title": "设备设置",
    "app.panel.settings.desc":
      "6 个选项卡：显示、键盘、音频、电源、PC 状态、固件。每个字段独立管理脏状态，面板底部的 diff 条显示 Apply 时会写哪些字段。",
    "app.panel.settings.bullets":
      "6 个选项卡覆盖全部 26 个可配置字段\n字段级范围限制与固件校验规则保持一致\n敏感字段（Wi-Fi 密码、ASR 密钥）在 UI 上打码\ndiff 预览条只列出有变化的字段",
    "app.panel.settings.tags": ["26 字段", "diff 预览", "打码"],

    "app.panel.keymap.title": "键映射编辑器",
    "app.panel.keymap.desc":
      "11 个按键 + 1 个旋钮的可视化编辑界面，含两层 FUN 修饰层。点击任意位置打开右侧抽屉编辑绑定，草稿实时更新。",
    "app.panel.keymap.bullets":
      "11 键 + 1 旋钮按比例渲染\n绑定类型：按键 / 组合 / 多键同按 / 文本片段 / 固件功能\n两层 FUN 修饰，每个位置都可独立配置\ndiff 预览列出所有绑定变更",
    "app.panel.keymap.tags": ["11 键", "FUN 层", "可视化"],

    "app.panel.lighting.title": "灯效",
    "app.panel.lighting.desc":
      "控制 11 颗 SK6812 LED。内置 5 种模式（常亮、呼吸、彩虹循环、按键高亮、音频律动），配取色器、亮度滑块和动画速度控制。",
    "app.panel.lighting.bullets":
      "5 种模式：常亮、呼吸、彩虹循环、按键高亮、音频律动\nHSV 取色器 + 亮度滑块\n按键高亮强度 + 闲置动画速度\n音频律动模式使用板载 MEMS 麦克风",
    "app.panel.lighting.tags": ["SK6812", "音频律动", "HSV"],

    "app.panel.wifi.title": "Wi-Fi 与时间",
    "app.panel.wifi.desc":
      "在设备上保存 Wi-Fi SSID 和密码，选择要镜像的主机电脑，未选主机时回退到公共 NTP。",
    "app.panel.wifi.bullets":
      "SSID + 密码（密码在输入后打码）\n选择要镜像哪台主机（PC 状态）\n未配置主机时回退到 NTP\n打码行为与协议规范保持一致",
    "app.panel.wifi.tags": ["2.4 GHz", "NTP", "PC 镜像"],

    "app.panel.audio.title": "音效板",
    "app.panel.audio.desc":
      "管理设备闪存上最多 11 个音频文件。文件通过协议上传，每个槽位绑定到一个按键；试播功能可在不修改绑定的情况下预览。",
    "app.panel.audio.bullets":
      "拖拽上传，实时进度 + 取消\n11 槽位绑定列表 + 设备文件浏览\n存储占用由设备实时回读\n试播不会修改绑定",
    "app.panel.audio.tags": ["≤ 2 MB / 文件", "MP3 / WAV", "11 槽位"],

    "app.panel.voice.title": "语音转文字",
    "app.panel.voice.desc":
      "配置按住说话语音键：触发键选择、最长录音时长、ASR 提供商、密钥。密钥保存在设备上，UI 上打码。",
    "app.panel.voice.bullets":
      "触发键（1~11）+ 最长录音时长\nASR 提供商：腾讯云一句话识别\nSecret ID 与 Secret Key 在 UI 上打码\n可选「自动进入 ASR 模式」",
    "app.panel.voice.tags": ["按住说话", "腾讯 ASR", "本地保存"],

    "app.panel.log.title": "日志",
    "app.panel.log.desc":
      "4 条带颜色的流（协议 TX、协议 RX、固件输出、App 输出）整合到同一可滚动视图。按来源和级别过滤、按文本搜索、跟随尾部。",
    "app.panel.log.bullets":
      "协议 TX（蓝）、RX（绿）、固件（灰）、App（白）\n按类别 + 最低级别 + 自由文本搜索\n自动跟随尾部，点击暂停\n5000 条环形缓冲",
    "app.panel.log.tags": ["4 条流", "搜索", "环形缓冲"],

    "app.panel.firmware.title": "固件升级",
    "app.panel.firmware.desc":
      "选择一个 .bin、计算其 MD5 校验和、启动一个仅回环的 HTTP 服务，并指示设备拉取文件。设备在校验通过后才切换到新分区。",
    "app.panel.firmware.bullets":
      "仅回环的 HTTP 服务（127.0.0.1）\n设备端校验 MD5\n进度条 + 状态信息在面板内实时显示\n升级失败则保留原分区不动",
    "app.panel.firmware.tags": ["OTA", "MD5", "A/B"],

    "app.section.shortcuts.eyebrow": "03 — 快捷键",
    "app.section.shortcuts.title": "快捷键。",
    "app.section.shortcuts.subtitle": "脱离鼠标也能完成全部面板操作。",

    "app.shortcut.f5": "重新拉取设备的全量配置快照",
    "app.shortcut.ctrlEnter": "应用当前改动",
    "app.shortcut.esc": "放弃当前改动",
    "app.shortcut.ctrlL": "打开日志面板",
    "app.shortcut.ctrl1": "打开「设备设置」",
    "app.shortcut.ctrl2": "打开「键映射编辑器」",
    "app.shortcut.ctrl3": "打开「灯效」",
    "app.shortcut.ctrl4": "打开「Wi-Fi 与时间」",
    "app.shortcut.ctrl5": "打开「音效板」",
    "app.shortcut.ctrl6": "打开「语音转文字」",
    "app.shortcut.ctrl7": "打开「日志」",
    "app.shortcut.ctrl8": "打开「关于」",

    "app.cta.eyebrow": "04 — 源代码",
    "app.cta.title": "源代码在 GitHub。",
    "app.cta.subtitle":
      "App 源码在 EKeysApp/ 仓库：Rust 源码、egui 面板、协议客户端，以及三大平台的 CI 构建产物。",
    "app.cta.button": "打开仓库",

    /* ---------------- 文档扩展章节 ---------------- */
    "docs.nav.connect": "连接流程",
    "docs.nav.keymap": "键映射编辑器",
    "docs.nav.audio": "音效板",
    "docs.nav.firmware": "固件升级",

    "docs.h.connect": "连接流程",
    "docs.p.connect":
      "点击 Connect 后，App 选中第一个 EKeys 串口、以 115200 波特打开并执行握手。成功后立刻拉取设备信息、全量设置快照、场景列表和音效绑定——所有面板的数据都由这次初始拉取填充。",
    "docs.steps.connect": [
      "以 115200 波特打开 USB CDC 端口",
      "把主机的时钟与时区同步到设备",
      "读出设备信息（名称、序列号、固件版本）",
      "拉取全量设置快照",
      "加载场景列表与当前激活的场景",
      "刷新音效板绑定",
      "启动 1 Hz 心跳并把连接标记为 Online",
    ],

    "docs.h.keymap": "键映射编辑器详解",
    "docs.p.keymap":
      "在可视化键盘上点任意位置打开抽屉。选择绑定类型（按键、组合、多键同按、文本片段、固件功能），调整参数时草稿实时更新。按 Apply 时编辑器算出最小改动集合，只向设备发送那些有变化的字段。",
    "docs.steps.keymap": [
      "点击可视化键盘上的某个位置",
      "在右侧抽屉选择绑定类型（按键 / 组合 / 多键同按 / 文本 / 功能）",
      "调整参数——草稿随输入实时更新",
      "可选：分配 FUN-1 / FUN-2 修饰键实现分层行为",
      "查看面板底部的 diff 预览",
      "按 Apply（或 Ctrl+Enter）只下发有变化的绑定",
      "日志里出现绿色 ACK 表示快照已更新",
    ],

    "docs.h.audio": "音效板详解",
    "docs.p.audio":
      "音效板管理设备闪存上最多 11 个音频槽位。拖入文件后，按固件的文件名规则（<code>a-z 0-9 _ + .mp3 / .wav</code>）命名，上传进度实时显示。任何键都可绑定到任意文件；试播可在不改绑定的情况下预览。",
    "docs.steps.audio": [
      "打开「音效板」面板",
      "拖入一个 ≤ 2 MB 的文件，或从磁盘选择",
      "指定设备侧文件名（或接受自动命名）",
      "点「上传」——进度实时；点「取消」可中断",
      "把 1~11 号键逐一绑定到文件",
      "点「试播」预览，或直接按设备上的键",
    ],

    "docs.h.firmware": "固件升级流程",
    "docs.p.firmware":
      "升级走 OTA。选中 <code>.bin</code> 后，App 计算 MD5 校验和、启动一个仅回环的 HTTP 服务，再让设备去拉文件。设备在校验通过后才切换到新分区。设备从不开放入站端口。",
    "docs.steps.firmware": [
      "在固件升级选项卡中选择一个 .bin",
      "App 计算 MD5 并启动仅回环的 HTTP 服务",
      "把 URL 与期望的校验和发给设备",
      "设备下载文件、校验通过后重启进入新分区",
      "任何一步失败，正在跑的固件都保持不变",
    ],
  },
};