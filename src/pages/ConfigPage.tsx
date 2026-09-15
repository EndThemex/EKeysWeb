import { ConfigPanel } from "../components/ConfigPanel";

/**
 * ConfigPage — 在浏览器里通过 Web Serial 连接 EKeys，
 * 读取当前设备的版本、设备信息、配置快照与 Profile 状态。
 */
export default function ConfigPage() {
  return (
    <main className="page page--config">
      <ConfigPanel />
    </main>
  );
}