import { create } from "zustand";
import { isNetworkError, type User } from "@pool-safety/shared";
import { api } from "../api/client";
export const useAuthStore = create<{
  user: User | null;
  ready: boolean;
  /** Set when a saved session could not be restored because the backend was unreachable. */
  offline: boolean;
}>(() => ({ user: null, ready: false, offline: false }));
api.subscribe((session) =>
  useAuthStore.setState({ user: session?.user || null }),
);
/** Restores the saved administrator session. A saved STAFF session is revoked: Desktop is ADMIN-only. */
export async function restoreAuth() {
  try {
    await api.auth.restore();
    useAuthStore.setState({ offline: false });
    if (api.session() && api.session()!.user.role !== "ADMIN")
      await api.auth.logout().catch(() => api.auth.clear());
  } catch (error) {
    useAuthStore.setState({ offline: isNetworkError(error) });
  } finally {
    useAuthStore.setState({ ready: true });
  }
}
