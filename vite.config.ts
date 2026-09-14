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
    },
  },
});