import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@pool-safety/shared";
import { useUiStore } from "../stores/uiStore";
/**
 * Loads data and reloads it when `deps` change or the app-wide revision is bumped
 * (realtime events, mutations). `reload` refreshes only this resource.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const revision = useUiStore((s) => s.revision);
  const [local, setLocal] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void load()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [...deps, revision, local]);
  const reload = useCallback(() => setLocal((n) => n + 1), []);
  return { data, error, loading, reload };
}
