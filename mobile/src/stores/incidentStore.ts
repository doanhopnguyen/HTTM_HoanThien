import { create } from "zustand";
import type { Incident } from "@pool-safety/shared";
export const useIncidentStore = create<{
  latest: Incident | null;
  receive: (value: Incident) => void;
}>((set) => ({ latest: null, receive: (latest) => set({ latest }) }));
