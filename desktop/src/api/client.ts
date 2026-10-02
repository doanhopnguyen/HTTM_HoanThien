import { createClient } from "@pool-safety/shared";
export let baseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export async function initializeConfig() {
  if (window.poolSafety)
    baseUrl = (await window.poolSafety.loadConfig()).baseUrl;
}
// Preview in a browser is intentionally ephemeral; Electron owns persistent secrets.
export const api = createClient({
  baseUrl: () => baseUrl,
  storage: {
    load: async () => window.poolSafety?.loadToken() || null,
    save: async (token) => {
      if (window.poolSafety) await window.poolSafety.saveToken(token);
    },
  },
});
