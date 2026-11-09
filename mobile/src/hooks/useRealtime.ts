import { useEffect } from "react";
import { AppState } from "react-native";
import {
  RealtimeClient,
  type Incident,
  type Notification,
} from "@pool-safety/shared";
import { api, baseUrl } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useNotificationStore } from "../stores/notificationStore";
import { notificationProvider } from "../services/pushNotifications";
/**
 * Foreground realtime connection. New incidents and personal alerts (e.g. an administrator
 * overriding my incident) are delivered through the notification provider; everything else
 * refreshes the visible screens. Background delivery requires a push provider (see services/).
 */
export function useRealtime() {
  const id = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!id) return;
    const refreshCount = () =>
      void useNotificationStore
        .getState()
        .load()
        .catch(() => undefined);
    const sync = () => {
      useUiStore.getState().invalidate();
      refreshCount();
    };
    const realtime = new RealtimeClient(
      api,
      () => baseUrl,
      (event) => {
        if (event.type === "INCIDENT_CREATED") {
          const incident = event.data as Incident;
          notificationProvider().present({
            title: `${incident.detectionEvent.eventType} alert · ${incident.camera.name}`,
            message: incident.camera.locationDescription ?? undefined,
            incidentId: incident.id,
            critical: true,
          });
        }
        if (event.type === "NOTIFICATION_CREATED") {
          const notification = event.data as Notification;
          if (notification.type === "INCIDENT_OVERRIDDEN")
            notificationProvider().present({
              title: notification.title,
              message: notification.message,
              incidentId: notification.incidentId ?? undefined,
              critical: false,
            });
        }
        if (event.type.startsWith("NOTIFICATION")) refreshCount();
        else sync();
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
      useUiStore.getState().dismiss();
      useNotificationStore.getState().reset();
    };
  }, [id]);
}
