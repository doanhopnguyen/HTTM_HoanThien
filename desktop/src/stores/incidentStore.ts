import { create } from "zustand";
import { activeStatuses, type Incident } from "@pool-safety/shared";
/**
 * Active alerts shown in the floating control-room panel. Seeded from the API on login
 * (so NEW incidents raised before login also appear) and kept current by realtime events.
 */
export const useIncidentStore = create<{
  alerts: Incident[];
  dismissed: string[];
  seed: (incidents: Incident[]) => void;
  receive: (incident: Incident) => void;
  dismiss: (id: string) => void;
  reset: () => void;
}>((set) => ({
  alerts: [],
  dismissed: [],
  seed: (incidents) =>
    set((state) => {
      const known = new Set(state.alerts.map((i) => i.id));
      const fresh = incidents.filter(
        (i) => !known.has(i.id) && !state.dismissed.includes(i.id),
      );
      return { alerts: [...state.alerts, ...fresh] };
    }),
  receive: (incident) =>
    set((state) => {
      const others = state.alerts.filter((i) => i.id !== incident.id);
      if (
        !activeStatuses.includes(incident.status) ||
        state.dismissed.includes(incident.id)
      )
        return { alerts: others };
      const existing = state.alerts.findIndex((i) => i.id === incident.id);
      // Only unclaimed incidents raise a new alert; claimed ones are tracked only if already shown.
      if (existing < 0)
        return incident.status === "NEW"
          ? { alerts: [incident, ...others] }
          : { alerts: others };
      // Update in place so the panel does not jump between alerts.
      const alerts = state.alerts.slice();
      alerts[existing] = incident;
      return { alerts };
    }),
  dismiss: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((i) => i.id !== id),
      dismissed: [...state.dismissed, id],
    })),
  reset: () => set({ alerts: [], dismissed: [] }),
}));
