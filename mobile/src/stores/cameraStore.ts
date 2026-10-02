import { create } from "zustand";
import type { Camera } from "@pool-safety/shared";
export const useCameraStore = create<{
  cameras: Camera[];
  set: (cameras: Camera[]) => void;
}>((set) => ({ cameras: [], set: (cameras) => set({ cameras }) }));
