import { create } from "zustand";
import { isNetworkError, type User } from "@pool-safety/shared";
import { api } from "../api/client";
export const useAuthStore = create<{
  user: User | null;
  ready: boolean;
  /** A saved session exists but the backend was unreachable; it is kept for a retry. */
  offline: boolean;
}>(() => ({ user: null, ready: false, offline: false }));
api.subscribe((session) =>
  useAuthStore.setState({ user: session?.user || null }),
);
export async function restoreAuth() {
  try {
    await api.auth.restore();
    useAuthStore.setState({ offline: false });
  } catch (error) {
    useAuthStore.setState({ offline: isNetworkError(error) });
  } finally {
    useAuthStore.setState({ ready: true });
  }
}
