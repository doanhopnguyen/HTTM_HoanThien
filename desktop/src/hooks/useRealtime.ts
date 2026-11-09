import { useEffect } from "react";
import { RealtimeClient, type Incident } from "@pool-safety/shared";
import { api, baseUrl } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useIncidentStore } from "../stores/incidentStore";
import { useNotificationStore } from "../stores/notificationStore";
export function useRealtime() {
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      useUiStore.getState().invalidate();
      void useNotificationStore.getState().load();
    };
    const realtime = new RealtimeClient(
      api,
      () => baseUrl,
      (event) => {
        if (event.type.startsWith("INCIDENT_"))
          useIncidentStore.getState().receive(event.data as Incident);
        if (event.type.startsWith("NOTIFICATION")) {
          void useNotificationStore.getState().load();
          return;
        }
        sync();
      },
      (connection) => useUiStore.setState({ connection }),
      sync,
    );
    realtime.start();
    // Fallback reconciliation covers missed messages and a temporarily unavailable WebSocket.
    const timer = setInterval(sync, 30000);
    return () => {
      realtime.stop();
      clearInterval(timer);
      useIncidentStore.getState().reset();
      useNotificationStore.getState().reset();
    };
  }, [userId]);
}
