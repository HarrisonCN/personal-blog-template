import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { DEFAULT_FONT, loadFont } from "./lib/fonts";
import { redirectPathToHashRoute } from "./lib/legacyPathRedirect";
import "./styles.css";
import "./theme-presets.css";
import "./theme-scenes.css";

redirectPathToHashRoute();

// Request the visitor's saved font preset (or the default) before first render.
try {
  loadFont(window.localStorage.getItem("template-font") || DEFAULT_FONT);
} catch {
  loadFont(DEFAULT_FONT);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
