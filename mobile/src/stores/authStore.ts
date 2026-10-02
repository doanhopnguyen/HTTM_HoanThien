import { create } from "zustand";
import { api } from "../api/client";
import type { User } from "@pool-safety/shared";
export const useAuthStore = create<{ user: User | null; ready: boolean }>(
  () => ({ user: null, ready: false }),
);
api.subscribe((session) =>
  useAuthStore.setState({ user: session?.user || null }),
);
export async function restoreAuth() {
  try {
    await api.auth.restore();
  } finally {
    useAuthStore.setState({ ready: true });
  }
}
