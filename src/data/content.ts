/* 站点静态内容（不随语言变化的元数据） */
export interface FeatureItem {
  num: string;
  titleKey: string;
  descKey: string;
  tagsKey: string;
}

export const FEATURES: FeatureItem[] = [
  { num: "// 01", titleKey: "feature.1.title", descKey: "feature.1.desc", tagsKey: "feature.1.tags" },
  { num: "// 02", titleKey: "feature.2.title", descKey: "feature.2.desc", tagsKey: "feature.2.tags" },
  { num: "// 03", titleKey: "feature.3.title", descKey: "feature.3.desc", tagsKey: "feature.3.tags" },
  { num: "// 04", titleKey: "feature.4.title", descKey: "feature.4.desc", tagsKey: "feature.4.tags" },
  { num: "// 05", titleKey: "feature.5.title", descKey: "feature.5.desc", tagsKey: "feature.5.tags" },
  { num: "// 06", titleKey: "feature.6.title", descKey: "feature.6.desc", tagsKey: "feature.6.tags" },
  { num: "// 07", titleKey: "feature.7.title", descKey: "feature.7.desc", tagsKey: "feature.7.tags" },
  { num: "// 08", titleKey: "feature.8.title", descKey: "feature.8.desc", tagsKey: "feature.8.tags" },
  { num: "// 09", titleKey: "feature.9.title", descKey: "feature.9.desc", tagsKey: "feature.9.tags" },
];

export interface ProfileItem {
  icon: string;
  titleKey: string;
  descKey: string;
  keysKey: string;
  index: string;
}

export const PROFILES: ProfileItem[] = [
  {
    icon: "⌘",
    titleKey: "profile.default.title",
    descKey: "profile.default.desc",
    keysKey: "profile.default.keys",
    index: "01",
  },
  {
    icon: "▶",
    titleKey: "profile.video.title",
    descKey: "profile.video.desc",
    keysKey: "profile.video.keys",
    index: "02",
  },
  {
    icon: "✎",
    titleKey: "profile.design.title",
    descKey: "profile.design.desc",
    keysKey: "profile.design.keys",
    index: "03",
  },
  {
    icon: "</>",
    titleKey: "profile.code.title",
    descKey: "profile.code.desc",
    keysKey: "profile.code.keys",
    index: "04",
  },
];

export interface SpecTab {
  id: string;
  tabKey: string;
  /** Specs rows are i18n keys, looked up at render time so each language can describe the spec in its own voice. */
  rows: { th: string; td: string }[];
}

/**
 * 按标签分组的产品参数。每行是 i18n key 引用，
 * 渲染时根据当前语言由 `dict.ts` 提供对应文案，
 * 避免中文界面出现硬编码英文。
 */
export const SPEC_TABS: SpecTab[] = [
  {
    id: "main",
    tabKey: "specs.tab.main",
    rows: [
      { th: "specs.row.mcu", td: "specs.row.mcu.v" },
      { th: "specs.row.memory", td: "specs.row.memory.v" },
      { th: "specs.row.display", td: "specs.row.display.v" },
      { th: "specs.row.lights", td: "specs.row.lights.v" },
      { th: "specs.row.encoder", td: "specs.row.encoder.v" },
      { th: "specs.row.voice", td: "specs.row.voice.v" },
    ],
  },
  {
    id: "io",
    tabKey: "specs.tab.io",
    rows: [
      { th: "specs.row.usb", td: "specs.row.usb.v" },
      { th: "specs.row.wireless", td: "specs.row.wireless.v" },
      { th: "specs.row.wifi", td: "specs.row.wifi.v" },
      { th: "specs.row.update", td: "specs.row.update.v" },
      { th: "specs.row.app", td: "specs.row.app.v" },
    ],
  },
  {
    id: "rf",
    tabKey: "specs.tab.rf",
    rows: [
      { th: "specs.row.audio.out", td: "specs.row.audio.out.v" },
      { th: "specs.row.audio.in", td: "specs.row.audio.in.v" },
      { th: "specs.row.display", td: "specs.row.display.v" },
      { th: "specs.row.lights", td: "specs.row.lights.v" },
    ],
  },
];

// 注：早期版本曾有 PINOUT（逐个引脚定义）模块，
// 整体偏向硬件开发视角，与产品参数页定位不符，
// 现已删除。如果未来要恢复，可考虑改为面向普通用户的
// “接口都在哪”示意图，而不是 GPIO 编号表。

// ============================================================
// 桌面 App 介绍区（与 EKeysApp 项目面板一一对应）
// ============================================================

export interface AppPanel {
  num: string;
  titleKey: string;
  descKey: string;
  bulletsKey: string;
  tagsKey: string;
}

/** EKeysApp 主导航下的 8 个面板，每条对应 src/ui/panel_*.rs 的一项。 */
export const APP_PANELS: AppPanel[] = [
  {
    num: "// P1",
    titleKey: "app.panel.connect.title",
    descKey: "app.panel.connect.desc",
    bulletsKey: "app.panel.connect.bullets",
    tagsKey: "app.panel.connect.tags",
  },
  {
    num: "// P2",
    titleKey: "app.panel.settings.title",
    descKey: "app.panel.settings.desc",
    bulletsKey: "app.panel.settings.bullets",
    tagsKey: "app.panel.settings.tags",
  },
  {
    num: "// P3",
    titleKey: "app.panel.keymap.title",
    descKey: "app.panel.keymap.desc",
    bulletsKey: "app.panel.keymap.bullets",
    tagsKey: "app.panel.keymap.tags",
  },
  {
    num: "// P4",
    titleKey: "app.panel.lighting.title",
    descKey: "app.panel.lighting.desc",
    bulletsKey: "app.panel.lighting.bullets",
    tagsKey: "app.panel.lighting.tags",
  },
  {
    num: "// P5",
    titleKey: "app.panel.wifi.title",
    descKey: "app.panel.wifi.desc",
    bulletsKey: "app.panel.wifi.bullets",
    tagsKey: "app.panel.wifi.tags",
  },
  {
    num: "// P6",
    titleKey: "app.panel.audio.title",
    descKey: "app.panel.audio.desc",
    bulletsKey: "app.panel.audio.bullets",
    tagsKey: "app.panel.audio.tags",
  },
  {
    num: "// P7",
    titleKey: "app.panel.voice.title",
    descKey: "app.panel.voice.desc",
    bulletsKey: "app.panel.voice.bullets",
    tagsKey: "app.panel.voice.tags",
  },
  {
    num: "// P8",
    titleKey: "app.panel.log.title",
    descKey: "app.panel.log.desc",
    bulletsKey: "app.panel.log.bullets",
    tagsKey: "app.panel.log.tags",
  },
  {
    num: "// P9",
    titleKey: "app.panel.firmware.title",
    descKey: "app.panel.firmware.desc",
    bulletsKey: "app.panel.firmware.bullets",
    tagsKey: "app.panel.firmware.tags",
  },
];

export interface AppShortcut {
  keys: string;
  descKey: string;
}

/** 桌面 App 快捷键（F5 / Ctrl+Enter / Esc / Ctrl+1~9 等） */
export const APP_SHORTCUTS: AppShortcut[] = [
  { keys: "F5", descKey: "app.shortcut.f5" },
  { keys: "Ctrl + Enter", descKey: "app.shortcut.ctrlEnter" },
  { keys: "Esc", descKey: "app.shortcut.esc" },
  { keys: "Ctrl + L", descKey: "app.shortcut.ctrlL" },
  { keys: "Ctrl + 1", descKey: "app.shortcut.ctrl1" },
  { keys: "Ctrl + 2", descKey: "app.shortcut.ctrl2" },
  { keys: "Ctrl + 3", descKey: "app.shortcut.ctrl3" },
  { keys: "Ctrl + 4", descKey: "app.shortcut.ctrl4" },
  { keys: "Ctrl + 5", descKey: "app.shortcut.ctrl5" },
  { keys: "Ctrl + 6", descKey: "app.shortcut.ctrl6" },
  { keys: "Ctrl + 7", descKey: "app.shortcut.ctrl7" },
  { keys: "Ctrl + 8", descKey: "app.shortcut.ctrl8" },
];

export interface AppPrinciple {
  num: string;
  titleKey: string;
  descKey: string;
}

/** 桌面 App 的设计原则（源自 docs/ui-design.md §1） */
export const APP_PRINCIPLES: AppPrinciple[] = [
  { num: "01", titleKey: "app.principle.1.title", descKey: "app.principle.1.desc" },
  { num: "02", titleKey: "app.principle.2.title", descKey: "app.principle.2.desc" },
  { num: "03", titleKey: "app.principle.3.title", descKey: "app.principle.3.desc" },
  { num: "04", titleKey: "app.principle.4.title", descKey: "app.principle.4.desc" },
  { num: "05", titleKey: "app.principle.5.title", descKey: "app.principle.5.desc" },
  { num: "06", titleKey: "app.principle.6.title", descKey: "app.principle.6.desc" },
];
