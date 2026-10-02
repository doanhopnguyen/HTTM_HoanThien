import { useEffect, useState } from "react";
import { errorMessage } from "@pool-safety/shared";
import { useUiStore } from "../stores/uiStore";
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const revision = useUiStore((s) => s.revision);
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
      .catch((error) => {
        if (alive) setError(errorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [...deps, revision]);
  return { data, error, loading };
}
