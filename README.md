# EKeysWeb

> 开源 11 键 ESP32-S3 宏键盘（macropad）项目的官方网站。

🔗 项目地址：<https://github.com/EndThemex/EKeysWeb>

---

## 项目简介

EKeysWeb 是 [EKeys](https://github.com/EndThemex/EKeysWeb) 开源硬件项目的官方网站，
基于 **React + Vite + TypeScript** 构建，使用 **Bun** 作为包管理与运行时。

网站展示 EKeys 这款 11 键 ESP32-S3 宏键盘的功能、规格、文档以及固件配套界面。

---

## 技术栈

- **React 18** — UI 框架
- **Vite 5** — 构建与开发服务器
- **TypeScript 5** — 类型安全
- **React Router 6** — 多页路由（Home / Features / Specs / Docs / App）
- **Bun** — 包管理 / 脚本运行

---

## 快速开始

环境要求：[Bun](https://bun.sh) ≥ 1.0（或 Node.js ≥ 18 + npm/pnpm/yarn）。

```bash
# 克隆
git clone https://github.com/EndThemex/EKeysWeb.git
cd EKeysWeb

# 安装依赖
bun install

# 启动开发服务器（默认 http://localhost:5173）
bun run dev
```

---

## 常用脚本

| 命令              | 说明                           |
| ----------------- | ------------------------------ |
| `bun run dev`     | 启动 Vite 开发服务器（热更新） |
| `bun run build`   | 类型检查 + 生产构建到 `dist/`  |
| `bun run preview` | 本地预览生产构建产物           |

---

## 项目结构

```text
EKeysWeb/
├── index.html              # Vite 入口 HTML
├── public-legacy/          # 历史静态页面（保留参考）
├── src/
│   ├── components/         # 公共组件（Header / Footer / Ticker / CodeBlock …）
│   ├── data/               # 站点静态内容（特性、Profile 等）
│   ├── hooks/              # 自定义 Hooks（useI18n / useDocumentMeta …）
│   ├── i18n/               # 多语言字典与上下文
│   ├── pages/              # 路由页面（Home / Features / Specs / Docs / App）
│   ├── styles/             # 全局与页面级样式
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
├── package.json
└── LICENSE
```

---

## 国际化

站点默认支持多语言切换，文案位于 [src/i18n/dict.ts](file:///d:/search/esp/Keys/EKeysWeb/src/i18n/dict.ts)，
新增语言请在 `dict.ts` 中补齐键值并在 [src/i18n/useI18n.tsx](file:///d:/search/esp/Keys/EKeysWeb/src/i18n/useI18n.tsx) 中注册。

---

## 贡献

欢迎以 Issue 或 Pull Request 的方式参与：

1. Fork 本仓库
2. 新建分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m "feat: your feature"`
4. 推送并发起 PR

请保持代码风格与现有模块一致，提交前确保 `bun run build` 通过。

---

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源。
