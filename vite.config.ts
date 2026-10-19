import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for EKeysWeb.
// Static-site entry, but rendered as a React SPA so we can keep the
// existing i18n / theme / navigation behaviour and progressively
// enhance individual sections.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    rollupOptions: {
      input: "index.html",
      output: {
        /**
         * 手动分包：把长期不变的依赖拆出来，让业务代码更新时这两块
         * 仍然命中浏览器缓存。
         * - three 只在 /model3d /showcase /prototype 懒加载时下载；
         * - react 全家桶（含 react-router）随首屏加载，但很少变动。
         */
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(
              id,
            )
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
});