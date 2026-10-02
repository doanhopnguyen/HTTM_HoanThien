import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@pool-safety/shared";
export const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8080";
export const api = createClient({
  baseUrl: () => baseUrl.replace(/\/$/, ""),
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
