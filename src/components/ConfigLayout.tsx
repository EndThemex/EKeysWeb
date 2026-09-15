/**
 * ConfigLayout — 二级 Tab 外壳（设计文档 §6.2 / §7）。
 *
 * 把 useEKeysDevice 提到顶层，让所有 Tab 通过 useDeviceSession() 共享实例，
 * 避免每页都重建连接。Tab 项：Settings / Keymap（M3 新增）/ Lighting /
 * Voice / Log / About。
 */

import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../i18n/useI18n.tsx";

const TABS = [
  { to: "/config", label: "config.tab.settings", end: true },
  { to: "/config/keymap", label: "config.tab.keymap" },
  { to: "/config/lighting", label: "config.tab.lighting" },
  { to: "/config/voice", label: "config.tab.voice" },
  { to: "/config/log", label: "config.tab.log" },
  { to: "/config/about", label: "config.tab.about" },
] as const;

export function ConfigLayout() {
  const { t } = useI18n();
  return (
    <main className="page page--config">
      <nav className="config-tabs" aria-label={t("config.tab.label")}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={"end" in tab ? tab.end : false}
            className={({ isActive }) =>
              `config-tabs__item ${isActive ? "is-active" : ""}`
            }
          >
            {t(tab.label)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}
