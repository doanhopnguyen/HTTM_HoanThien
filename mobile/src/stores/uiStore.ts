import { create } from "zustand";
import type { ConnectionStatus } from "@pool-safety/shared";
export const useUiStore = create<{
  revision: number;
  connection: ConnectionStatus;
  toast: string | null;
  toastIncidentId: string | null;
  invalidate: () => void;
  notify: (message: string, incidentId?: string) => void;
}>((set) => ({
  revision: 0,
  connection: "disconnected",
  toast: null,
  toastIncidentId: null,
  invalidate: () => set((state) => ({ revision: state.revision + 1 })),
  notify: (toast, toastIncidentId) =>
    set({ toast, toastIncidentId: toastIncidentId || null }),
}));
