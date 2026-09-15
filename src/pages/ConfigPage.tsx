/**
 * ConfigPage 入口：直接渲染 SettingsPanel。
 *
 * M2 路由变更后此处不再使用；ConfigLayout 已在 App.tsx 中挂载为父路由。
 * 保留此文件以避免其它页面（导航链接、SEO）的引用失效。
 */
import { SettingsPanel } from "../components/SettingsPanel";

export default function ConfigPage() {
  return (
    <main className="page page--config">
      <SettingsPanel />
    </main>
  );
}
