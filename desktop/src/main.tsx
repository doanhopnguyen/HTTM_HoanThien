import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./routes/App";
import { initializeConfig } from "./api/client";
import { restoreAuth } from "./stores/authStore";
import "./styles.css";
async function boot() {
  try {
    await initializeConfig();
    await restoreAuth();
  } catch {
    /* Login remains available when the backend is offline. */
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
void boot();
