import { create } from "zustand";
import { api } from "../api/client";
export const useNotificationStore = create<{
  unread: number;
  load: () => Promise<void>;
}>((set) => ({
  unread: 0,
  load: async () => {
    set({ unread: await api.notifications.count() });
  },
}));
