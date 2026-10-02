import { create } from "zustand";
import type { Notification } from "@pool-safety/shared";
import { errorMessage } from "@pool-safety/shared";
import { api } from "../api/client";
export const useNotificationStore = create<{
  items: Notification[];
  unread: number;
  error: string | null;
  load: () => Promise<void>;
}>((set) => ({
  items: [],
  unread: 0,
  error: null,
  load: async () => {
    try {
      const [page, unread] = await Promise.all([
        api.notifications.list(),
        api.notifications.count(),
      ]);
      set({ items: page.content, unread, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
}));
