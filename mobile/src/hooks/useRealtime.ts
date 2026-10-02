import { useEffect } from "react";
import { AppState, Vibration } from "react-native";
import { RealtimeClient, type Incident } from "@pool-safety/shared";
import { api, baseUrl } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useIncidentStore } from "../stores/incidentStore";
import { useNotificationStore } from "../stores/notificationStore";
export function useRealtime() {
  const id = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!id) return;
    const sync = () => {
      useUiStore.getState().invalidate();
      void useNotificationStore
        .getState()
        .load()
        .catch(() => undefined);
    };
    const realtime = new RealtimeClient(
      api,
      () => baseUrl,
      (event) => {
        if (event.type.startsWith("INCIDENT_")) {
          const incident = event.data as Incident;
          useIncidentStore.getState().receive(incident);
          if (event.type === "INCIDENT_CREATED") {
            Vibration.vibrate([0, 350, 150, 350]);
            useUiStore
              .getState()
              .notify(
                `${incident.detectionEvent.eventType} alert · ${incident.camera.name}`,
                incident.id,
              );
          }
        }
        sync();
      },
      (connection) => useUiStore.setState({ connection }),
      sync,
    );
    realtime.start();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") sync();
    }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") realtime.start();
      else realtime.stop();
    });
    return () => {
      realtime.stop();
      clearInterval(timer);
      subscription.remove();
      useUiStore.setState({ toast: null, toastIncidentId: null });
      useIncidentStore.setState({ latest: null });
      useNotificationStore.setState({ unread: 0 });
    };
  }, [id]);
}
