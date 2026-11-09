import { create } from "zustand";
import type { ConnectionStatus } from "@pool-safety/shared";
export type ToastTone = "info" | "success" | "error";
export interface ToastMessage {
  message: string;
  tone: ToastTone;
}
export const useUiStore = create<{
  revision: number;
  connection: ConnectionStatus;
  toast: ToastMessage | null;
  notify: (message: string, tone?: ToastTone) => void;
  invalidate: () => void;
}>((set) => ({
  revision: 0,
  connection: "disconnected",
  toast: null,
  notify: (message, tone = "info") => set({ toast: { message, tone } }),
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
}));
