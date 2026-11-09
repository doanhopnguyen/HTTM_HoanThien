import { useEffect } from "react";
import { create } from "zustand";
import type { Capabilities } from "@pool-safety/shared";
import { api } from "../api/client";
const useCapabilityStore = create<{ value: Capabilities | null }>(() => ({
  value: null,
}));
let pending: Promise<void> | null = null;
/** Backend capabilities (e.g. staff false alarm), fetched once per session. */
export function useCapabilities() {
  const value = useCapabilityStore((s) => s.value);
  useEffect(() => {
    if (value || pending) return;
    pending = api
      .capabilities()
      .then((result) => useCapabilityStore.setState({ value: result }))
      .catch(() => undefined)
      .finally(() => {
        pending = null;
      });
  }, [value]);
  return value;
}
