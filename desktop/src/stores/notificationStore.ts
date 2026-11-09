import { create } from "zustand";
import type { Notification } from "@pool-safety/shared";
import { errorMessage } from "@pool-safety/shared";
import { api } from "../api/client";
const PAGE_SIZE = 20;
/** The API caps page size at 100, so the dropdown shows at most the latest 100. */
const MAX_PAGES = 5;
export const useNotificationStore = create<{
  items: Notification[];
  unread: number;
  error: string | null;
  /** Number of pages currently shown (dropdown "Load more"). */
  pages: number;
  hasMore: boolean;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}>((set, get) => ({
  items: [],
  unread: 0,
  error: null,
  pages: 1,
  hasMore: false,
  load: async () => {
    try {
      const [page, unread] = await Promise.all([
        api.notifications.list({ size: PAGE_SIZE * get().pages }),
        api.notifications.count(),
      ]);
      set({
        items: page.content,
        unread,
        error: null,
        hasMore: !page.last && get().pages < MAX_PAGES,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
  loadMore: async () => {
    set((state) => ({ pages: Math.min(state.pages + 1, MAX_PAGES) }));
    await get().load();
  },
  reset: () =>
    set({ items: [], unread: 0, error: null, pages: 1, hasMore: false }),
}));
