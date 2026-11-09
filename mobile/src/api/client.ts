import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@pool-safety/shared";
/**
 * Backend origin from EXPO_PUBLIC_API_BASE_URL (embedded at build time). There is no silent
 * fallback: a phone must use the LAN IP or HTTPS host of the backend, never a guessed address.
 */
export const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
/** Absolute HTTP(S) URL; a path prefix is allowed for backends behind a reverse proxy. */
export const configured = /^https?:\/\/[^/\s?#]+(\/[^\s?#]*)?$/i.test(baseUrl);
export const api = createClient({
  baseUrl: () => baseUrl,
  storage: {
    // Browser preview is ephemeral; Android/iOS always use platform secure storage.
    load: () =>
      Platform.OS === "web"
        ? Promise.resolve(null)
        : SecureStore.getItemAsync("pool-safety-refresh"),
    save: (token) =>
      Platform.OS === "web"
        ? Promise.resolve()
        : token
          ? SecureStore.setItemAsync("pool-safety-refresh", token)
          : SecureStore.deleteItemAsync("pool-safety-refresh"),
  },
});
