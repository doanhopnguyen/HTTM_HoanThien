import { create } from "zustand";
import { api } from "../api/client";
/** Unread notification count for the header bell; refreshed by realtime events. */
export const useNotificationStore = create<{
  unread: number;
  load: () => Promise<void>;
  reset: () => void;
}>((set) => ({
  unread: 0,
  load: async () => {
    set({ unread: await api.notifications.count() });
  },
  reset: () => set({ unread: 0 }),
}));
