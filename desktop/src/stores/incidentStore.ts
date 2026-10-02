import { create } from "zustand";
import type { Incident } from "@pool-safety/shared";
export const useIncidentStore = create<{
  latest: Incident | null;
  alert: Incident | null;
  receive: (incident: Incident, created: boolean) => void;
  dismiss: () => void;
}>((set) => ({
  latest: null,
  alert: null,
  receive: (incident, created) =>
    set((state) => ({
      latest: incident,
      alert: created
        ? incident
        : state.alert?.id === incident.id
          ? incident
          : state.alert,
    })),
  dismiss: () => set({ alert: null }),
}));
