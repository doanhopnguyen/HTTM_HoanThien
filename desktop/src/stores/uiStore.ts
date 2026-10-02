import { create } from "zustand";
import type { ConnectionStatus } from "@pool-safety/shared";
export const useUiStore = create<{
  revision: number;
  connection: ConnectionStatus;
  toast: string | null;
  notify: (message: string) => void;
  invalidate: () => void;
}>((set) => ({
  revision: 0,
  connection: "disconnected",
  toast: null,
  notify: (toast) => set({ toast }),
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
}));
