/* EKeysWeb — 中英文本字典
   与原 assets/js/i18n.js 中的 DICT 完全一致。
   保持单数据源，方便后续扩展更多语言。 */

export type Lang = "en" | "zh";
export type Dict = Record<string, string | string[]>;

export const DICT: Record<Lang, Dict> = {
  en: {
    "nav.home": "Home",
    "nav.features": "What's in it",
    "nav.specs": "Specs",
    "nav.docs": "Get started",
    "nav.github": "GitHub",

    "hero.eyebrow": "a tiny board with a wild streak",
    "hero.title.1": "SAY HI TO EKEYS",
    "hero.title.2": "YOUR DESK'S NEW FAVORITE GADGET",
    "hero.lede":
      "A palm-sized 11-key sidekick with a chunky knob, a slim color screen and a halo of soft light. Plug it in, tap a scene, and suddenly the boring parts of your day disappear behind one tap.",
    "hero.cta.primary": "show me the tricks",
    "hero.cta.secondary": "how does it work?",
    "hero.meta.chip": "Brains",
    "hero.meta.keys": "Buttons",
    "hero.meta.link": "Plugs in via",
    "hero.meta.app": "Tinker with",
    "hero.meta.chip.v": "ESP32-S3 · 240 MHz",
    "hero.meta.keys.v": "11 keys + 1 chunky knob",
    "hero.meta.link.v": "USB-C · Bluetooth",
    "hero.device.tag": "EKEYS / V0.1",

    "site.title.home": "EKeys · a tiny sidekick for your keyboard",
    "site.title.features": "What's in it · EKeys",
    "site.title.specs": "Specs · EKeys",
    "site.title.docs": "Get started · EKeys",
    "site.description":
      "EKeys — a pocket 11-key macropad with a knob, a tiny screen, soft lights, voice input and an open-source soul.",

    "ticker.line":
      "◆ one-tap copy & paste ◆ glow under every key ◆ whisper commands to your PC ◆ eight scenes, infinite moods ◆ built for desk dwellers ◆ open the source, hack the rest ◆",

    "section.features.eyebrow": "01 — what it does",
    "section.features.title": "less digging, more doing.",
    "section.features.subtitle":
      "Stop memorizing shortcuts. Stop hunting through menus. EKeys puts your everyday moves right under your thumb, with a soft glow that quietly tells you what each key is going to do.",

    "features.pipeline.eyebrow": "// from tap to action",
    "features.pipeline.title": "from your fingertip to your screen.",
    "features.pipeline.desc":
      "Press a key and the signal hops through a few quick stops before reaching your computer. Here's the peek behind the curtain.",
    "features.pipeline.fig1": "DIAG · 01",
    "features.pipeline.fig2": "DIAG · 02",
    "features.pipeline.fig1.body":
      "[KEY MATRIX 3×4]\n      │  raw row signals\n      ▼\n[Scanner]\n   tidy up → key id 1..11\n      │\n      ▼\n[Key Resolver]\n   ├─ one function\n   ├─ a few keystrokes\n   └─ a tiny macro\n      │\n      ▼\n[Dispatcher]\n      │\n      ├─▶ [USB keyboard]  (USB-C cable)\n      └─▶ [Bluetooth keyboard]\n      │\n      ▼\n[Lights · Tiny screen · Logs]",
    "features.pipeline.fig2.body":
      "[YOUR COMPUTER · EKeysApp]\n      │  USB-C cable (115200)\n      │  or Wi-Fi (TCP 30000 · UDP 30001)\n      ▼\n[Chat Protocol]\n   one JSON note per line\n   bit 7 of cmd = reply\n   seq = 0      = device pushed it\n      │\n      ▼\n[Command List]\n   18 commands, a few favorites:\n   • 0x06 send a new keymap\n   • 0x07 read / 0x08 tweak settings\n   • 0x09 report key presses\n   • 0x10 jump to another scene\n   • 0x11 upload scene icon\n   • 0x0B install a new brain\n   • 0x0D PC stats / 0x0E music info",

    "feature.1.title": "plug it in, you're good",
    "feature.1.desc":
      "A USB-C cable and you're rolling. It also chats over Bluetooth, so your laptop, tablet and phone can hang out together — no extra dongles to lose.",
    "feature.1.tags": ["USB-C", "Bluetooth", "plug & play"],

    "feature.2.title": "keys that mean something",
    "feature.2.desc":
      "Eleven keys, each one assigned to the thing you do most — paste, screenshot, mute, scrub a timeline, switch tool, anything. You're the boss.",
    "feature.2.tags": ["11 keys", "shortcuts", "macros"],

    "feature.3.title": "a knob just for the screen",
    "feature.3.desc":
      "Spin to move, tap to confirm, double-tap to back out. The knob only talks to the little screen — flipping tracks, jumping scenes, scrolling the status view — so it never gets tangled up with your keymap.",
    "feature.3.tags": ["spin", "tap", "screen nav"],

    "feature.4.title": "a tiny screen, big on info",
    "feature.4.desc":
      "The slim strip keeps an eye on what matters right now — your scene, the time, the work mode, Wi-Fi bars, the song playing, or your PC's CPU and memory. Spin the knob to flip through views.",
    "feature.4.tags": ["strip LCD", "live info", "glanceable"],

    "feature.5.title": "lights that match the mood",
    "feature.5.desc":
      "Eleven soft-glow LEDs hiding under every keycap. Pick a steady color, let them breathe when you're idle, ripple through the rainbow, or just have the key you pressed light up — whatever vibe fits the desk.",
    "feature.5.tags": ["per-key RGB", "click glow", "animations"],

    "feature.6.title": "just talk to it",
    "feature.6.desc":
      "Hold the voice key and say what's on your mind. Backed by Tencent's one-shot speech recognition, the words land wherever your cursor is — a chat box, a doc, anywhere. Flip on auto-enter and it'll even hit Return for you.",
    "feature.6.tags": ["speech-to-text", "Tencent ASR", "trigger key"],

    "feature.7.title": "offline first, online if you want",
    "feature.7.desc":
      "Plug it in and every key just works — no Wi-Fi needed. When you do join a network, EKeys grabs the time, mirrors your PC's status, and shows it all on the little screen. No internet, no problem.",
    "feature.7.tags": ["offline-first", "Wi-Fi", "status mirror"],

    "feature.8.title": "eight moods, one pad",
    "feature.8.desc":
      "Editing video at noon, painting at 3pm, coding at night? One tap swaps the whole vibe. Each scene keeps its own 11 keys, custom icon, on-screen label and shortcuts — flip between them from the app or a physical key.",
    "feature.8.tags": ["8 scenes", "custom icons", "live switch"],

    "feature.9.title": "updates without the drama",
    "feature.9.desc":
      "Pick a .bin in the companion app and EKeys pulls it over the air through a tiny local server with a checksum check. If anything goes sideways mid-update, the old firmware stays put — no brick, no panic.",
    "feature.9.tags": ["OTA", "MD5", "safe rollback"],

    "section.profiles.eyebrow": "02 — pick your vibe",
    "section.profiles.title": "one pad, many moods.",
    "section.profiles.subtitle":
      "Pick a scene and the keys, lights and screen all rearrange themselves to match what you're doing.",

    "profile.default.title": "everyday",
    "profile.default.desc":
      "Copy, paste, mute, screenshot — the tiny things that should always be one tap away.",
    "profile.default.keys": "11 KEYS · EVERYDAY",

    "profile.video.title": "video edit",
    "profile.video.desc":
      "Scrub the timeline, slice clips, drop markers, swipe away the bad takes — without ever leaving the keys.",
    "profile.video.keys": "11 KEYS · VIDEO",

    "profile.design.title": "design & paint",
    "profile.design.desc":
      "Zoom in, grab a color, swap layers. The knob feels just right for brushing across your canvas.",
    "profile.design.keys": "11 KEYS · DESIGN",

    "profile.code.title": "code",
    "profile.code.desc":
      "Build, run, debug, format, refactor. Stop hunting for the menu — your fingers stay on the home row.",
    "profile.code.keys": "11 KEYS · CODE",

    "marquee.text":
      "open source · diy · macropad · shortcut · scene · knob · screen · light · voice · wifi ·",

    "specs.eyebrow": "03 — what's inside",
    "specs.title": "the bits that make it tick.",
    "specs.subtitle":
      "A quick look at the parts inside — the same list we ship with every firmware release.",

    "specs.tab.main": "the board",
    "specs.tab.io": "buttons & ports",
    "specs.tab.rf": "wireless & audio",

    "specs.size.eyebrow": "// size & shape",
    "specs.size.title": "small enough to live anywhere.",
    "specs.size.desc":
      "About the size of a deck of cards. USB-C on the back, soft little feet underneath, and just enough weight to keep it from sliding off your desk.",
    "specs.size.fig.top": "FIG · 03 — TOP",
    "specs.size.fig.back": "FIG · 04 — BACK",
    "specs.size.label.knob": "KNOB",
    "specs.size.label.usbc": "USB-C",
    "specs.size.label.vent": "VENT HOLES",

    "specs.row.mcu": "Brain chip",
    "specs.row.mcu.v": "ESP32-S3 dual-core · 240 MHz",
    "specs.row.memory": "Memory",
    "specs.row.memory.v": "16 MB flash · 8 MB working memory",
    "specs.row.display": "Screen",
    "specs.row.display.v": "Slim strip LCD · 428 × 142 · 16.7 M colors",
    "specs.row.lights": "Lights",
    "specs.row.lights.v": "11 per-key RGB · soft glow under the caps",
    "specs.row.encoder": "Knob",
    "specs.row.encoder.v": "Spin · tap · double-tap",
    "specs.row.voice": "Voice key",
    "specs.row.voice.v": "One key, one sentence",
    "specs.row.usb": "Wired",
    "specs.row.usb.v": "USB-C · just plug it in, no drivers",
    "specs.row.wireless": "Wireless",
    "specs.row.wireless.v": "Bluetooth 5.0 · pairs with phones, tablets, laptops",
    "specs.row.wifi": "Wi-Fi",
    "specs.row.wifi.v": "2.4 GHz · syncs time and shows your PC's status",
    "specs.row.audio.out": "Speaker",
    "specs.row.audio.out.v": "Built-in 3 W mono · click & feedback sounds",
    "specs.row.audio.in": "Microphone",
    "specs.row.audio.in.v": "Built-in · fuels the voice key and future tricks",
    "specs.row.update": "Updates",
    "specs.row.update.v": "Over-the-air · rolls back if anything breaks",
    "specs.row.app": "Companion app",
    "specs.row.app.v": "Windows / macOS / Linux · drag-and-drop setup",

    "cta.bottom.eyebrow": "04 — make it yours",
    "cta.bottom.title": "make it yours.",
    "cta.bottom.subtitle":
      "Every line of code, every schematic, every flashing guide — all open for you to read, change and share.",
    "cta.bottom.button": "read the guides",

    "footer.tagline":
      "A pocket-sized sidekick for people who love making things — and a tidy desk.",
    "footer.product": "Product",
    "footer.resources": "Learn",
    "footer.community": "Community",
    "footer.copy": "© 2026 the EKeys project",
    "footer.build": "v0.1.0 · static web",

    "brand.tagline": "// 11-key sidekick",

    "a11y.toggleTheme": "toggle theme",
    "a11y.toggleLang": "switch language",
    "a11y.openMenu": "open menu",
    "a11y.closeMenu": "close menu",
    "a11y.scrollTop": "back to top",

    "docs.title": "getting started",
    "docs.lede":
      "New to EKeys? Start here. You don't need to be an engineer — these guides walk you through everything, from unboxing to your first custom scene.",
    "docs.nav.eyebrow": "// index",
    "docs.nav.overview": "what is EKeys?",
    "docs.nav.build": "set it up",
    "docs.nav.protocol": "for tinkerers",
    "docs.nav.app": "companion app",
    "docs.nav.roadmap": "what's coming",

    "docs.h.companion": "// the family",
    "docs.p.companion.lede": "Two free, open-source pieces come with EKeys:",
    "docs.p.companion.firmware":
      "<code>EKeys/</code> — the brain that runs on the device itself.",
    "docs.p.companion.app":
      "<code>EKeysApp/</code> — a desktop app for Windows, macOS and Linux that lets you rearrange keys, swap scenes and update the firmware.",
    "docs.p.companion.tail":
      "This website is just a friendly tour — when you're ready to dig deeper, the full READMEs in each project are the next stop.",

    "docs.h.overview": "what is EKeys?",
    "docs.p.overview":
      "EKeys is a small 11-key pad that lives next to your keyboard. It has a knob, a tiny screen, soft-glow lights and connects to your computer over USB-C or Bluetooth. It runs open-source firmware, so you can change how it works whenever you want.",

    "docs.h.build": "set it up",
    "docs.p.build":
      "Bought a ready-made EKeys? Just plug it in — it works out of the box. Building one yourself? These five little commands will flash the firmware and load the default scenes.",
    "docs.code.build":
      "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

    "docs.h.protocol": "for tinkerers",
    "docs.p.protocol":
      'Want to build your own app that talks to EKeys? It uses a simple JSON message format over USB or Wi-Fi. Send a frame like <code>{"cmd":3,"data":{...}}</code> and the device replies. Every command is documented, and the device pops up on your network automatically.',

    "docs.h.app": "companion app",
    "docs.p.app":
      "The companion app (called EKeysApp) lets you rearrange keys, change scenes and update firmware with a friendly interface. It runs on Windows, macOS and Linux. Your settings are saved automatically — no manual file editing.",

    "docs.h.roadmap": "what's coming",
    "docs.p.roadmap":
      "We're constantly adding small features based on what the community asks for. Coming soon: smarter lighting scenes, longer battery life, more voice languages, and a marketplace where people can share their favorite layouts.",

    /* ---------------- Companion app sections ---------------- */
    "nav.app": "Companion app",
    "app.hero.eyebrow": "free · open source · runs everywhere",
    "app.hero.title.1": "EKEYS APP",
    "app.hero.title.2": "MEET YOUR COPILOT",
    "app.hero.lede":
      "A tiny desktop app written in Rust that talks to EKeys over USB. Rearrange keys, swap scenes, manage sounds and watch what the device is up to — all without lifting your hands off the keyboard.",
    "app.hero.cta.primary": "meet every panel",
    "app.hero.cta.secondary": "read the protocol",
    "app.hero.meta.lang": "Built with",
    "app.hero.meta.lang.v": "Rust · egui · serde",
    "app.hero.meta.platform": "Runs on",
    "app.hero.meta.platform.v": "Windows / macOS / Linux",
    "app.hero.meta.link": "Talks via",
    "app.hero.meta.link.v": "USB CDC · 115200",
    "app.hero.device.tag": "EKEYS APP / V0.1",

    "app.section.principles.eyebrow": "01 — how it's made",
    "app.section.principles.title": "built like a tiny control panel.",
    "app.section.principles.subtitle":
      "Every UI choice exists for one reason: to give the device a sensible, predictable home you can actually live with.",

    "app.principle.1.title": "status first",
    "app.principle.1.desc":
      "Connections changing, snapshots landing, things being pushed — the app tells you before you ask. A status light, a little toast, a log line.",
    "app.principle.2.title": "shortest path",
    "app.principle.2.desc":
      "From launching the app to your first saved config: no more than four clicks. Anything longer is a bug.",
    "app.principle.3.title": "always undoable",
    "app.principle.3.desc":
      "Every edit lives as a draft. Preview, then either apply it to the device or drop it. Nothing gets sent by accident.",
    "app.principle.4.title": "logs by color",
    "app.principle.4.desc":
      "Protocol frames, firmware logs and app logs each get their own color, so a quick glance tells you who's talking.",
    "app.principle.5.title": "plays nice with the future",
    "app.principle.5.desc":
      "When the firmware grows new fields, the app quietly ignores them. No crashes, no frozen UI — just a line in the log.",
    "app.principle.6.title": "keyboard friendly",
    "app.principle.6.desc":
      "Tab steps through every field. Common actions have shortcuts (F5, Ctrl+Enter, Esc, Ctrl+1–8).",

    "app.section.panels.eyebrow": "02 — what's inside",
    "app.section.panels.title": "nine panels, one sidebar.",
    "app.section.panels.subtitle":
      "Each page on the left rail does one thing. Pick the panel that matches what you want to do — everything else gets out of the way.",

    "app.panel.connect.title": "Connection",
    "app.panel.connect.desc":
      "Pick a port, hit connect, the device pops online. EKeys gets filtered automatically, and your last port is remembered for next time.",
    "app.panel.connect.bullets":
      "Auto-filtered port picker, hot-plug friendly\nAuto-reconnect that doesn't panic\nRemembers your last port + auto-connect toggle, saved locally\nStatus block shows the last handshake and any recent hiccups",
    "app.panel.connect.tags": ["USB CDC", "auto-reconnect", "startup"],

    "app.panel.settings.title": "Device settings",
    "app.panel.settings.desc":
      "The heart of the app: six tabs covering display, keyboard, audio, power, PC status and firmware. Every field uses edit → preview → apply, so nothing reaches the device until you say so.",
    "app.panel.settings.bullets":
      "Six tabs: Display, Keyboard, Audio, Power, PC status, Firmware\nDiff preview bar at the bottom — only changed fields get sent\nField-by-field clamps mirror the firmware's own rules\nSensitive fields (Wi-Fi password, ASR keys) are masked on sight",
    "app.panel.settings.tags": ["26 fields", "preview", "masked secrets"],

    "app.panel.keymap.title": "Keymap editor",
    "app.panel.keymap.desc":
      "Eleven keys, one knob, three layers — drawn to look like the real device. Click a key, pick a binding, watch the draft grow until you hit Apply.",
    "app.panel.keymap.bullets":
      "Visual board with 11 keys + 1 knob\nBind regular keys, combos, multi-press, text snippets, firmware functions\nTwo FUN modifier layers with their own per-key behavior\nDiff preview shows every change before it ships to the device",
    "app.panel.keymap.tags": ["11 keys", "FUN layers", "visual editor"],

    "app.panel.lighting.title": "Lighting",
    "app.panel.lighting.desc":
      "Eleven per-key RGB lights hiding under soft-glow caps. Pick a mode, dial in a color, or hand the job to the music analyzer and let the LEDs follow the beat.",
    "app.panel.lighting.bullets":
      "Mode picker: steady, breathe, wave, music, click-highlight\nColor wheel + brightness slider\nClick-highlight strength + idle animation speed\nMusic reactivity powered by the on-board microphone",
    "app.panel.lighting.tags": ["per-key RGB", "music sync", "click feedback"],

    "app.panel.wifi.title": "Wi-Fi & time",
    "app.panel.wifi.desc":
      "Drop in your Wi-Fi name, pick the computer to mirror, and the little screen starts showing time, weather and your PC's status.",
    "app.panel.wifi.bullets":
      "Wi-Fi name + password (password is masked in the UI)\nPick which computer to mirror (PC status, time sync)\nFalls back to internet time when no computer is set\nSensitive value masking follows the protocol rules",
    "app.panel.wifi.tags": ["2.4 GHz", "internet time", "mirroring"],

    "app.panel.audio.title": "Sound pad",
    "app.panel.audio.desc":
      "Drop MP3 or WAV files onto the device's storage, bind each one to a key, and play them with a tap. Built for streamers, teachers and anyone who keeps a soundboard on their desk.",
    "app.panel.audio.bullets":
      "Drag-and-drop uploads with a live progress bar and cancel\n11-key bindings shown next to a live file list\nStorage usage + free space mirrored straight from the device\nTry-play any file without changing its binding",
    "app.panel.audio.tags": ["up to 2 MB", "MP3/WAV", "per-key binding"],

    "app.panel.voice.title": "Speech-to-text",
    "app.panel.voice.desc":
      "One key, one sentence. Hold the voice key, speak, release — your words land on the cursor or trigger a command. Powered by Tencent's cloud speech recognition, with keys stored safely on the device.",
    "app.panel.voice.bullets":
      "Pick a trigger key (1–11) and a max record length\nChoose your speech-recognition provider (Tencent one-shot ASR)\nSecret ID / Secret Key are masked in the UI\nAuto-enter ASR mode toggle for hands-free starts",
    "app.panel.voice.tags": ["speech-to-text", "Tencent ASR", "trigger key"],

    "app.panel.log.title": "Log",
    "app.panel.log.desc":
      "Three colored streams in one scrollback. Filter by source (TX / RX / firmware / app), search by text, follow live without losing your place.",
    "app.panel.log.bullets":
      "Protocol TX (blue), RX (green), firmware (gray), app (white)\nFilter by category and level, plus free-text search\nAuto-follow tail, click to pause\n5000-entry ring buffer keeps memory tidy",
    "app.panel.log.tags": ["3 streams", "search", "follow tail"],

    "app.panel.firmware.title": "Firmware update",
    "app.panel.firmware.desc":
      "Pick a `.bin`, the app starts a tiny local server, and the device pulls the file over the air. If anything fails, the old firmware stays put — no bricking.",
    "app.panel.firmware.bullets":
      "Local server (loopback only) feeds the device\nChecksum travels with the request for safety\nProgress + status mirrored right in the panel\nSafe rollback on any failure",
    "app.panel.firmware.tags": ["OTA", "checksum", "rollback"],

    "app.section.shortcuts.eyebrow": "03 — speed keys",
    "app.section.shortcuts.title": "faster than the mouse.",
    "app.section.shortcuts.subtitle":
      "All the navigation you need, with both hands on the home row.",

    "app.shortcut.f5": "Re-pull the full config snapshot from the device",
    "app.shortcut.ctrlEnter": "Apply the pending changes to the device",
    "app.shortcut.esc": "Discard the pending changes",
    "app.shortcut.ctrlL": "Jump to the Log panel",
    "app.shortcut.ctrl1": "Open Settings",
    "app.shortcut.ctrl2": "Open Keymap",
    "app.shortcut.ctrl3": "Open Lighting",
    "app.shortcut.ctrl4": "Open Wi-Fi",
    "app.shortcut.ctrl5": "Open Sound pad",
    "app.shortcut.ctrl6": "Open Voice",
    "app.shortcut.ctrl7": "Open Log",
    "app.shortcut.ctrl8": "Open About",

    "app.cta.eyebrow": "04 — one last thing",
    "app.cta.title": "it's all on GitHub.",
    "app.cta.subtitle":
      "Every line of Rust, every panel, every icon — open source, free to fork, free to learn from.",
    "app.cta.button": "browse the repo",

    /* ---------------- Extended docs sections ---------------- */
    "docs.nav.connect": "Connection",
    "docs.nav.keymap": "Keymap editor",
    "docs.nav.audio": "Sound pad",
    "docs.nav.firmware": "Firmware update",

    "docs.h.connect": "connection flow",
    "docs.p.connect":
      "When you click Connect on the sidebar, the app picks the first EKeys USB port, opens it at 115200 and runs a friendly hello handshake. If it works, the app immediately grabs the device info, your full settings, your scene list and your sound bindings — so every panel is already up to date by the time the first frame paints.",
    "docs.steps.connect": [
      "Open the port (USB, 115200, simple line-by-line chat)",
      "Sync your computer's clock and timezone with the device",
      "Read the device info (name, serial number, firmware version)",
      "Pull the full settings snapshot",
      "Load the list of scenes and the one that's active right now",
      "Refresh the sound pad bindings",
      "Start the heartbeat (1 beat per second) and mark the connection Online",
    ],

    "docs.h.keymap": "keymap editor in depth",
    "docs.p.keymap":
      "Click any key on the board to open its drawer on the right. Pick a binding type (ordinary key, combo, multi-press, text snippet, firmware function), tweak the parameters, and the draft updates in place. When you press <code>Apply</code> the editor figures out the smallest set of changes and sends just those — nothing extra gets touched.",
    "docs.steps.keymap": [
      "Click a key on the visual board to select it",
      "Choose a binding type in the drawer (key / combo / chord / text / function)",
      "Tweak the parameters; the draft updates as you type",
      "Optional: assign FUN-1 / FUN-2 modifier keys for layered behavior",
      "Glance at the diff preview bar at the bottom",
      "Press Apply (or hit Ctrl+Enter) to send just the changes",
      "Watch the green ACK land in the log; the snapshot is updated",
    ],

    "docs.h.audio": "sound pad in depth",
    "docs.p.audio":
      "The Sound Pad panel gives you 11 audio slots. Drag a file into the upload zone, give it a name the firmware likes (<code>a-z 0-9 _ + .mp3 / .wav</code>), and watch the progress bar fill up. Bind any key to any file, then either tap a key on the device or use the Try-play button to hear it.",
    "docs.steps.audio": [
      "Open the Sound Pad panel",
      "Drop a file (≤ 2 MB) onto the area, or pick one from disk",
      "Pick a device-side filename (or accept the auto-generated one)",
      "Press Upload — progress is live; Cancel rolls back",
      "Bind keys 1–11 to any file from the dropdown",
      "Hit Try-play to verify, or just press the key on the device",
    ],

    "docs.h.firmware": "firmware update flow",
    "docs.p.firmware":
      "Updates happen over the air. Pick a <code>.bin</code> file, the app figures out its checksum, starts a tiny local server, and asks the device to pull the firmware by URL. The device never opens an incoming port — it just reaches out. If anything fails, the running firmware is left completely alone.",
    "docs.steps.firmware": [
      "Pick a .bin from the Firmware tab",
      "The app computes the checksum and starts a local-only server",
      "It tells the device the URL and the checksum",
      "The device pulls the file, checks the checksum, and reboots",
      "If anything goes wrong, the running firmware stays untouched",
    ],
  },

  zh: {
    "nav.home": "首页",
    "nav.features": "里面有啥",
    "nav.specs": "参数",
    "nav.docs": "上手玩",
    "nav.github": "GitHub",

    "hero.eyebrow": "巴掌大的小玩件，骨子里野得很",
    "hero.title.1": "来认识下 EKEYS",
    "hero.title.2": "桌面上的新宠",
    "hero.lede":
      "巴掌大的 11 键小搭档，配上一颗敦实的旋钮、一条彩色的窄屏、一圈柔和的灯光。插上、点一下场景键，一按就把今天的繁琐活儿塞回抽屉里。",
    "hero.cta.primary": "看看有啥好玩的",
    "hero.cta.secondary": "它是怎么工作的？",
    "hero.meta.chip": "主芯片",
    "hero.meta.keys": "按键",
    "hero.meta.link": "连接方式",
    "hero.meta.app": "调参靠",
    "hero.meta.chip.v": "ESP32-S3 · 240 MHz",
    "hero.meta.keys.v": "11 个键 + 1 颗敦实旋钮",
    "hero.meta.link.v": "USB-C · 蓝牙",
    "hero.device.tag": "EKEYS / V0.1",

    "site.title.home": "EKeys · 放在键盘旁的小搭档",
    "site.title.features": "里面有啥 · EKeys",
    "site.title.specs": "参数 · EKeys",
    "site.title.docs": "上手玩 · EKeys",
    "site.description":
      "EKeys —— 巴掌大的 11 键小键盘，带旋钮、小屏、柔光、语音识音，骨子里还是个开源玩具。",

    "ticker.line":
      "◆ 一键复制粘贴 ◆ 每颗键下都有柔光 ◆ 对着它说句话 ◆ 八种场景随心切 ◆ 为折腾的人而生 ◆ 开源随你改 ◆",

    "section.features.eyebrow": "01 — 它能做啥",
    "section.features.title": "少翻找，多做事。",
    "section.features.subtitle":
      "不必再记快捷键，不必再翻菜单。EKeys 把最常用的操作放你拇指下，柔柔的灯效悄悄告诉你每个键在干嘛。",

    "features.pipeline.eyebrow": "// 按一下键，信号怎么走",
    "features.pipeline.title": "从指尖一路跑到屏幕。",
    "features.pipeline.desc":
      "按下键，信号要经过几个小站点才到电脑。下面掀开盖子给你瞅瞅。",
    "features.pipeline.fig1": "图 · 01",
    "features.pipeline.fig2": "图 · 02",
    "features.pipeline.fig1.body":
      "[按键矩阵 3×4]\n      │  一排排原始信号\n      ▼\n[扫描小助手]\n   去抖 → 认出 1~11 号键\n      │\n      ▼\n[键义翻译官]\n   ├─ 一个功能\n   ├─ 几个按键\n   └─ 一段小宏\n      │\n      ▼\n[派发小工]\n      │\n      ├─▶ [USB 键盘]  (USB-C 数据线)\n      └─▶ [蓝牙键盘]\n      │\n      ▼\n[柔光 · 小屏 · 日志]",
    "features.pipeline.fig2.body":
      "[你的电脑 · EKeysApp]\n      │  USB-C 数据线（115200）\n      │  或者 Wi-Fi（TCP 30000 · UDP 30001）\n      ▼\n[串口小信使]\n   一行一条 JSON 小纸条\n   命令字 bit 7 = 要不要回信\n   seq = 0     = 设备主动推过来\n      │\n      ▼\n[命令清单]\n   一共 18 条，挑几个顺眼的：\n   • 0x06 下发新键位\n   • 0x07 读取 / 0x08 改设置\n   • 0x09 上报按键动作\n   • 0x10 切换场景\n   • 0x11 上传场景图标\n   • 0x0B 换颗新脑子\n   • 0x0D 电脑状态 / 0x0E 音乐信息",

    "feature.1.title": "插上就能耍",
    "feature.1.desc":
      "一根 USB-C 数据线搞定。它还支持蓝牙，笔记本、平板、手机一起玩，都不用再买接收器。",
    "feature.1.tags": ["USB-C", "蓝牙", "即插即用"],

    "feature.2.title": "每个键都有活儿",
    "feature.2.desc":
      "11 个键，每颗都让你安排最常用的动作：粘贴、截图、静音、刮时间线、换工具……想怎么定就怎么定。",
    "feature.2.tags": ["11 键", "快捷键", "宏"],

    "feature.3.title": "旋钮只跟小屏玩",
    "feature.3.desc":
      "转着翻、点下确认、双击返回。旋钮只跟小屏打交道——切歌、跳场景、滚动状态页——绝不会和你的键位打架。",
    "feature.3.tags": ["旋转", "点按", "屏幕导航"],

    "feature.4.title": "小屏幕，信息管够",
    "feature.4.desc":
      "窄条彩屏一眼告诉你当下最重要的：场景、时间、工作模式、Wi-Fi 信号、在播的歌，或者电脑的 CPU 和内存。转下旋钮就能在多个视图间切。",
    "feature.4.tags": ["窄条彩屏", "实时信息", "一眼可见"],

    "feature.5.title": "灯光配合你心情",
    "feature.5.desc":
      "11 颗柔光 LED 偷偷藏在键帽下面。可以常亮一色、可以闲置时缓缓呼吸、可以彩虹流动，也可以只点亮你按下的那颗——挑一种适合桌面气氛的。",
    "feature.5.tags": ["逐键 RGB", "按键亮起", "动画"],

    "feature.6.title": "直接对它说",
    "feature.6.desc":
      "按住语音键开口说话。背后是腾讯云一句话识别，说完文字就跑到光标处——聊天框、文档、哪都行。打开自动回车，一句话结束自动换行，全程不碰手。",
    "feature.6.tags": ["语音转文字", "腾讯 ASR", "触发键"],

    "feature.7.title": "默认离线，按需联网",
    "feature.7.desc":
      "插上就能用，每颗键都立刻开工——完全不需要网络。接上 Wi-Fi 后，EKeys 自动校时、镜像电脑状态，全显示在小屏幕上。断网？照旧。",
    "feature.7.tags": ["离线优先", "Wi-Fi", "状态镜像"],

    "feature.8.title": "八个心情，一把键盘",
    "feature.8.desc":
      "中午剪视频、下午画画、晚上写代码？一按就切换。每个场景都自带 11 键映射、自定义图标、屏幕标签——App 里或实体键都能切。",
    "feature.8.tags": ["8 个场景", "自定义图标", "随时切换"],

    "feature.9.title": "升级不慌",
    "feature.9.desc":
      "在配套 App 里挑好 .bin，EKeys 就走本地服务自己拉，全程带校验。过程中任何环节出错，正在跑的固件都安然无恙——变砖？不存在的。",
    "feature.9.tags": ["OTA", "MD5", "安全回滚"],

    "section.profiles.eyebrow": "02 — 挑个心情",
    "section.profiles.title": "一把键盘，多种玩法。",
    "section.profiles.subtitle":
      "选个场景，按键、灯光、屏幕都自动换装，贴上你正在忙的事。",

    "profile.default.title": "日常",
    "profile.default.desc":
      "复制、粘贴、静音、截图——这些小动作就该一按就到。",
    "profile.default.keys": "11 键 · 日常",

    "profile.video.title": "剪视频",
    "profile.video.desc":
      "刮时间线、裁片段、打标记、扔掉废素材——全程不离键。",
    "profile.video.keys": "11 键 · 视频",

    "profile.design.title": "设计与画画",
    "profile.design.desc": "放大、取色、换图层。旋钮划过画布刚刚好。",
    "profile.design.keys": "11 键 · 设计",

    "profile.code.title": "写代码",
    "profile.code.desc": "构建、运行、调试、格式化、重构——告别菜单翻找。",
    "profile.code.keys": "11 键 · 代码",

    "marquee.text":
      "开源 · diy · 键盘 · 快捷 · 场景 · 旋钮 · 屏幕 · 灯光 · 语音 · wifi ·",

    "specs.eyebrow": "03 — 肚子里有啥",
    "specs.title": "看看里面都塞了什么。",
    "specs.subtitle":
      "EKeys 关键参数速览——和每次发版说明保持一致。",

    "specs.tab.main": "主板",
    "specs.tab.io": "按键和接口",
    "specs.tab.rf": "无线和音效",

    "specs.size.eyebrow": "// 尺寸外观",
    "specs.size.title": "够小，放哪都不占地。",
    "specs.size.desc":
      "差不多一副扑克牌大小。背面是 USB-C 接口，底下藏着软胶小脚垫，重量刚好不会乱滑。",
    "specs.size.fig.top": "图 · 03 — 正面",
    "specs.size.fig.back": "图 · 04 — 背面",
    "specs.size.label.knob": "旋钮",
    "specs.size.label.usbc": "USB-C",
    "specs.size.label.vent": "散热孔",

    "specs.row.mcu": "主芯片",
    "specs.row.mcu.v": "ESP32-S3 双核 · 240 MHz",
    "specs.row.memory": "内存",
    "specs.row.memory.v": "16 MB 闪存 · 8 MB 运行内存",
    "specs.row.display": "屏幕",
    "specs.row.display.v": "窄条彩屏 · 428 × 142 · 1670 万色",
    "specs.row.lights": "灯光",
    "specs.row.lights.v": "11 颗独立 RGB · 柔光键帽",
    "specs.row.encoder": "旋钮",
    "specs.row.encoder.v": "旋转 · 点按 · 双击",
    "specs.row.voice": "语音键",
    "specs.row.voice.v": "一键语音转文字",
    "specs.row.usb": "有线",
    "specs.row.usb.v": "USB-C · 插上就用 · 不用装驱动",
    "specs.row.wireless": "无线",
    "specs.row.wireless.v": "蓝牙 5.0 · 手机、平板、笔记本都能连",
    "specs.row.wifi": "Wi-Fi",
    "specs.row.wifi.v": "2.4 GHz · 同步时间、显示电脑状态",
    "specs.row.audio.out": "扬声器",
    "specs.row.audio.out.v": "内置 3 W 单声道 · 按键反馈音和提示",
    "specs.row.audio.in": "麦克风",
    "specs.row.audio.in.v": "内置 · 喂饱语音键和未来玩法",
    "specs.row.update": "升级",
    "specs.row.update.v": "空中推送 · 出问题自动回滚",
    "specs.row.app": "配套 App",
    "specs.row.app.v": "支持 Windows / macOS / Linux · 拖拽即可改键",

    "cta.bottom.eyebrow": "04 — 把它变成你的",
    "cta.bottom.title": "把它变成你的。",
    "cta.bottom.subtitle":
      "每一行代码、每一张接线图、每一步教程——全部开源，欢迎读、改、分享。",
    "cta.bottom.button": "看教程",

    "footer.tagline": "给爱折腾的人准备的迷你小搭档，让桌面也清清爽爽。",
    "footer.product": "产品",
    "footer.resources": "学习",
    "footer.community": "社区",
    "footer.copy": "© 2026 EKeys 项目",
    "footer.build": "v0.1.0 · 静态网页",

    "brand.tagline": "// 11 键小搭档",

    "a11y.toggleTheme": "换主题",
    "a11y.toggleLang": "换语言",
    "a11y.openMenu": "打开菜单",
    "a11y.closeMenu": "关闭菜单",
    "a11y.scrollTop": "回到顶部",

    "docs.title": "上手玩",
    "docs.lede":
      "新手朋友看这里。不用懂技术——从开箱到第一套自定义场景，每一步都写得明明白白。",
    "docs.nav.eyebrow": "// 目录",
    "docs.nav.overview": "EKeys 是啥？",
    "docs.nav.build": "怎么开整",
    "docs.nav.protocol": "折腾派专属",
    "docs.nav.app": "配套 App",
    "docs.nav.roadmap": "下一步计划",

    "docs.h.companion": "// 配套两兄弟",
    "docs.p.companion.lede": "EKeys 自带两个免费、开源的小伙伴：",
    "docs.p.companion.firmware": "<code>EKeys/</code> —— 跑在设备上的小脑袋（固件）。",
    "docs.p.companion.app":
      "<code>EKeysApp/</code> —— 桌面应用，Windows / macOS / Linux 都能装，可以改键位、切场景、升级小脑袋。",
    "docs.p.companion.tail":
      "本站只是一段友好导览。等你想再深入一层，每个项目里的完整 README 就是下一步。",

    "docs.h.overview": "EKeys 是啥？",
    "docs.p.overview":
      "EKeys 是一块放在键盘旁边的小玩件，有 11 个键、一颗旋钮、一块小屏幕和柔柔的灯光。插 USB-C 或连蓝牙就能和电脑对话，骨子里是开源的，你想怎么改都行。",

    "docs.h.build": "怎么开整",
    "docs.p.build":
      "买的整机？插上就能耍。自己 DIY？下面五行命令能把固件刷进去并装好默认场景。",
    "docs.code.build":
      "pio run -e esp32-s3-wroom-1-n16r8\npio run -e esp32-s3-wroom-1-n16r8 -t upload\npio run -e esp32-s3-wroom-1-n16r8 -t uploadfs\npio device monitor -b 115200",

    "docs.h.protocol": "折腾派专属",
    "docs.p.protocol":
      '想自己写程序和 EKeys 聊聊天？它用一种简单的 JSON 小纸条格式，通过 USB 或 Wi-Fi 收发。发一条像 <code>{"cmd":3,"data":{...}}</code> 的纸条过去，设备就会回。每条命令都有说明，设备也能在局域网里被自动找到。',

    "docs.h.app": "配套 App",
    "docs.p.app":
      "配套的 EKeysApp 用一个友好的界面让你改键位、切场景、升级固件。Windows / macOS / Linux 都能用，设置自动存好——不用自己手动改文件。",

    "docs.h.roadmap": "下一步计划",
    "docs.p.roadmap":
      "我们会跟着社区的声音不断加小功能。排队中的有：更聪明的灯光场景、更长的续航、更多语音语言，还有一个让大家分享心爱布局的市场。",

    /* ---------------- 配套桌面 App 介绍 ---------------- */
    "nav.app": "配套 App",
    "app.hero.eyebrow": "免费 · 开源 · 三系统通吃",
    "app.hero.title.1": "EKEYS APP",
    "app.hero.title.2": "设备的驾驶舱",
    "app.hero.lede":
      "一个用 Rust 写的桌面小应用，通过 USB 和 EKeys 对话。改键位、换场景、管音效、看日志——全程不离主键盘。",
    "app.hero.cta.primary": "逛逛每个面板",
    "app.hero.cta.secondary": "瞅瞅协议",
    "app.hero.meta.lang": "技术栈",
    "app.hero.meta.lang.v": "Rust · egui · serde",
    "app.hero.meta.platform": "支持系统",
    "app.hero.meta.platform.v": "Windows / macOS / Linux",
    "app.hero.meta.link": "对话方式",
    "app.hero.meta.link.v": "USB · 115200",
    "app.hero.device.tag": "EKEYS APP / V0.1",

    "app.section.principles.eyebrow": "01 — 怎么造的",
    "app.section.principles.title": "像一块小控制台。",
    "app.section.principles.subtitle":
      "每个 UI 选择都只有一个理由：让设备变得更顺手、更可预期。",

    "app.principle.1.title": "状态先说话",
    "app.principle.1.desc":
      "连接变化、快照到达、设备推送——App 比你先一步知道。状态灯、小气泡、日志全到位。",
    "app.principle.2.title": "路径最短",
    "app.principle.2.desc":
      "从打开 App 到第一次保存配置，不超过 4 次点击。多一次都是 bug。",
    "app.principle.3.title": "随时撤回",
    "app.principle.3.desc":
      "所有改动都先放在草稿里。预览、确认才下发，扔掉也只用按一下 Esc。",
    "app.principle.4.title": "日志看颜色",
    "app.principle.4.desc":
      "协议帧、固件日志、应用日志各自染色，一眼就能分清是哪边在说话。",
    "app.principle.5.title": "和未来友好",
    "app.principle.5.desc":
      "固件加了新字段时，App 默默忽略——不崩溃、不卡死，只在日志里悄悄留一行。",
    "app.principle.6.title": "键盘友好",
    "app.principle.6.desc":
      "每个面板都能用 Tab 切换焦点，常用动作都配了快捷键（F5 / Ctrl+Enter / Esc / Ctrl+1~8）。",

    "app.section.panels.eyebrow": "02 — 里面有啥",
    "app.section.panels.title": "九个面板，一条侧栏。",
    "app.section.panels.subtitle":
      "左侧每一页只管一件事。想干啥就进哪个面板，其它都让开。",

    "app.panel.connect.title": "连接",
    "app.panel.connect.desc":
      "选好端口，点一下连接，设备就上线。EKeys 自动过滤，上次用过的端口也会记住。",
    "app.panel.connect.bullets":
      "自动过滤的端口选择器，热插拔友好\n不慌不忙的自动重连\n记住上次端口 + 自动连接开关，本地存好\n状态区显示最近一次握手和近期小插曲",
    "app.panel.connect.tags": ["USB", "自动重连", "开机自启"],

    "app.panel.settings.title": "设备设置",
    "app.panel.settings.desc":
      "App 的心脏：六个选项卡，覆盖显示、键盘、音频、电源、PC 状态、固件。每个字段都是「编辑 → 预览 → 应用」三步走，确认才下发。",
    "app.panel.settings.bullets":
      "六个选项卡：显示 / 键盘 / 音频 / 电源 / PC 状态 / 固件\n底部 diff 预览条，只发有变化的字段\n字段级卡尺和固件规则一一对齐\n敏感字段（Wi-Fi 密码、ASR 密钥）自动打码",
    "app.panel.settings.tags": ["26 个字段", "diff 预览", "脱敏"],

    "app.panel.keymap.title": "键映射",
    "app.panel.keymap.desc":
      "11 键 + 1 旋钮 + 3 层通道，画出来就是设备本身。点一个键、配一个动作，草稿实时更新，按 Apply 才下发。",
    "app.panel.keymap.bullets":
      "可视化键盘，11 个按键 + 1 个旋钮\n支持普通键 / 组合键 / 多键同按 / 文本片段 / 固件功能\n两个 FUN 修饰层，每个键都可以有自己的 FUN 表现\n底部 diff 预览，所有改动一目了然",
    "app.panel.keymap.tags": ["11 键", "FUN 层", "可视化"],

    "app.panel.lighting.title": "灯效",
    "app.panel.lighting.desc":
      "11 颗独立 RGB 灯，藏在柔光键帽下面。选个模式、调个颜色，或者让内置麦克风接管，跟着节拍闪。",
    "app.panel.lighting.bullets":
      "模式选择：常亮 / 呼吸 / 流水 / 音乐 / 按键高亮\n取色器 + 亮度滑块\n按键高亮强度 + 闲置动画速度\n音乐律动由板载麦克风驱动",
    "app.panel.lighting.tags": ["逐键 RGB", "音乐律动", "按键高亮"],

    "app.panel.wifi.title": "Wi-Fi 和时间",
    "app.panel.wifi.desc":
      "填上 Wi-Fi 名字，选好要镜像的电脑，小屏幕上就开始显示时间、天气、电脑状态。",
    "app.panel.wifi.bullets":
      "Wi-Fi 名 + 密码（密码在 UI 上自动打码）\n选好要镜像哪台电脑（PC 状态 / 时间同步）\n没配置电脑时自动走网络时间\n脱敏规则和协议保持一致",
    "app.panel.wifi.tags": ["2.4 GHz", "网络时间", "镜像"],

    "app.panel.audio.title": "音效板",
    "app.panel.audio.desc":
      "把 MP3 / WAV 拖进设备里，每键绑一首，按一下就播。为主播、老师和爱玩音效板的人准备。",
    "app.panel.audio.bullets":
      "拖拽上传，进度条 + 取消按钮\n11 键绑定列表 + 文件清单一目了然\n存储占用 / 剩余空间和设备实时同步\n试播按钮，不会改你的绑定",
    "app.panel.audio.tags": ["≤ 2 MB", "MP3/WAV", "逐键绑定"],

    "app.panel.voice.title": "语音转文字",
    "app.panel.voice.desc":
      "一键一句话。按住语音键开口说话，松开后文字落到光标处，或者直接触发指令。云端用腾讯一句话识别，密钥安全保存在设备上。",
    "app.panel.voice.bullets":
      "选好触发键（1~11）和最长录音时长\n可切换 ASR 提供商（腾讯云一句话识别）\nSecret ID / Secret Key 在 UI 上自动打码\n支持自动进入 ASR 模式，连按键都省了",
    "app.panel.voice.tags": ["语音转文字", "腾讯 ASR", "触发键"],

    "app.panel.log.title": "日志",
    "app.panel.log.desc":
      "三种颜色的小溪在同一个滚动区里流。按来源过滤（TX / RX / 固件 / 应用），按文本搜索，自动跟随最新一行。",
    "app.panel.log.bullets":
      "协议 TX（蓝）/ RX（绿）、固件（灰）、应用（白）\n按类别 + 最低级别 + 自由文本搜索\n自动跟随尾巴，点一下暂停\n5000 条环形缓冲，内存不爆",
    "app.panel.log.tags": ["三种流", "搜索", "跟随尾巴"],

    "app.panel.firmware.title": "固件升级",
    "app.panel.firmware.desc":
      "挑好 .bin 文件，App 起一个本地服务，设备自己来拉。中途任何一步出错，旧固件都安然无恙——变砖是不存在的。",
    "app.panel.firmware.bullets":
      "本机服务（仅回环）喂给设备\n校验码跟着请求一起走\n升级进度 + 状态实时显示\n任何失败都安全回滚",
    "app.panel.firmware.tags": ["OTA", "校验码", "回滚"],

    "app.section.shortcuts.eyebrow": "03 — 快捷键",
    "app.section.shortcuts.title": "比鼠标快。",
    "app.section.shortcuts.subtitle": "两只手不离主键盘行，就能逛完所有面板。",

    "app.shortcut.f5": "重新拉取设备的全量配置快照",
    "app.shortcut.ctrlEnter": "把当前改动下发到设备",
    "app.shortcut.esc": "放弃当前改动",
    "app.shortcut.ctrlL": "跳到日志页",
    "app.shortcut.ctrl1": "打开「设备设置」",
    "app.shortcut.ctrl2": "打开「键映射」",
    "app.shortcut.ctrl3": "打开「灯效」",
    "app.shortcut.ctrl4": "打开「Wi-Fi」",
    "app.shortcut.ctrl5": "打开「音效板」",
    "app.shortcut.ctrl6": "打开「语音」",
    "app.shortcut.ctrl7": "打开「日志」",
    "app.shortcut.ctrl8": "打开「关于」",

    "app.cta.eyebrow": "04 — 顺手提一句",
    "app.cta.title": "代码全开源。",
    "app.cta.subtitle":
      "每一行 Rust、每一个面板、每一个图标——开源、欢迎 fork、欢迎拿来学。",
    "app.cta.button": "去 GitHub 看代码",

    /* ---------------- 文档扩展章节 ---------------- */
    "docs.nav.connect": "连接流程",
    "docs.nav.keymap": "键映射编辑器",
    "docs.nav.audio": "音效板",
    "docs.nav.firmware": "固件升级",

    "docs.h.connect": "连接流程",
    "docs.p.connect":
      "点一下左侧的「连接」，App 就自己跑去挑一个 EKeys 串口，以 115200 波特打开，再做个友好的打招呼握手。成了的话，App 立刻把设备信息、全部设置、场景列表、音效绑定一把抓回来——所以等你看到第一帧画面时，所有面板的数据都已经是真实的。",
    "docs.steps.connect": [
      "把端口打开（USB、115200、一行行聊天）",
      "把电脑的时间和时区同步给设备",
      "读出设备信息（名字、序列号、固件版本）",
      "拉一份完整的设置快照",
      "把场景列表和当前激活的那一个都读出来",
      "刷新一下音效板的绑定",
      "开始 1 秒一跳的心跳，连接标记为 Online",
    ],

    "docs.h.keymap": "键映射编辑器详解",
    "docs.p.keymap":
      "在可视化键盘上点任意一个键，右侧的小抽屉就弹出来。挑一种绑定类型（普通键 / 组合键 / 多键同按 / 文本片段 / 固件功能），边调边看草稿变化。点 <code>Apply</code> 时，编辑器会算出最小改动，只下发那些变化的字段，其它一概不碰。",
    "docs.steps.keymap": [
      "点可视化键盘上的某个键选中",
      "在右侧抽屉选好绑定类型（普通键 / 组合 / 多键 / 文本 / 功能）",
      "调参数，草稿会一边打字一边更新",
      "可选：分配 FUN-1 / FUN-2 修饰键，搞出分层行为",
      "瞄一眼底部的 diff 预览条",
      "点 Apply（或按 Ctrl+Enter）下发，只发改动的那部分",
      "看到日志里跳出绿色 ACK，快照就更新好了",
    ],

    "docs.h.audio": "音效板详解",
    "docs.p.audio":
      "音效板有 11 个音频槽位。拖一个文件进上传区，按固件规则起个名字（<code>a-z 0-9 _ + .mp3 / .wav</code>），进度条会实时推进。把任意一个键位绑到任意文件，然后按设备上的键或在 App 里点「试播」就能听到。",
    "docs.steps.audio": [
      "打开「音效板」面板",
      "把 ≤ 2 MB 的文件拖进来，或从磁盘选一个",
      "起一个设备端能认的文件名（或接受自动起的那个）",
      "点「上传」——进度实时显示；点取消自动回滚",
      "把 1~11 号键逐一绑到任意文件",
      "点「试播」听听效果，或直接按设备上的键",
    ],

    "docs.h.firmware": "固件升级流程",
    "docs.p.firmware":
      "升级走 OTA。挑好 <code>.bin</code>，App 算好校验码，起一个本地小服务，让设备按 URL 自己来拉。设备从来不开放入站端口——只是单向 GET。中间任何一步出错，正在跑的固件都安然无恙。",
    "docs.steps.firmware": [
      "在「固件升级」选项卡里挑一个 .bin",
      "App 算好校验码，起一个只回环的本地服务",
      "把 URL 和校验码告诉设备",
      "设备拉取文件，校验通过后自动重启",
      "任何环节出错，正在跑的固件都纹丝不动",
    ],
  },
};