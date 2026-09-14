import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n/useI18n.tsx";
import "./styles/index.css";

/**
 * Hide the boot skeleton once React has mounted. We schedule this for the
 * next frame so the actual content is in the DOM before the skeleton fades,
 * preventing any white-flash between skeleton and rendered tree.
 */
function hideBootSplash() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.classList.add("is-hidden");
  // Remove from DOM after the transition completes so it doesn't trap focus.
  window.setTimeout(() => boot.remove(), 350);
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App onMounted={hideBootSplash} />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>,
);
