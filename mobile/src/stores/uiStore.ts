import { create } from "zustand";
import type { ConnectionStatus } from "@pool-safety/shared";
export type BannerTone = "critical" | "success" | "info";
export interface Banner {
  title: string;
  message?: string;
  tone: BannerTone;
  incidentId?: string;
  /** Critical banners stay until the user taps or dismisses them. */
  sticky: boolean;
}
export const useUiStore = create<{
  revision: number;
  connection: ConnectionStatus;
  banner: Banner | null;
  invalidate: () => void;
  /** Short, auto-dismissed message (action result, errors). */
  notify: (message: string, tone?: BannerTone) => void;
  show: (banner: Banner) => void;
  dismiss: () => void;
}>((set) => ({
  revision: 0,
  connection: "disconnected",
  banner: null,
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
  notify: (message, tone = "info") =>
    set({ banner: { title: message, tone, sticky: false } }),
  show: (banner) => set({ banner }),
  dismiss: () => set({ banner: null }),
}));
