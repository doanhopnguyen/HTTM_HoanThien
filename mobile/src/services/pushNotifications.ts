import { Vibration } from "react-native";
import { useUiStore } from "../stores/uiStore";
/** Something the user must be told about: a new incident, an override, … */
export interface AlertMessage {
  title: string;
  message?: string;
  incidentId?: string;
  critical: boolean;
}
/**
 * Platform-neutral delivery boundary. The in-app provider runs while the app is in the foreground.
 * A future FCM/APNs provider implements the same interface: `register` returns the device token to
 * send to the backend, and `present` is used for messages received while the app is open.
 */
export interface PushNotificationProvider {
  register(): Promise<string | null>;
  unregister(): Promise<void>;
  present(alert: AlertMessage): void;
}
export class InAppNotificationProvider implements PushNotificationProvider {
  async register() {
    return null;
  }
  async unregister() {}
  present(alert: AlertMessage) {
    if (alert.critical) Vibration.vibrate([0, 350, 150, 350]);
    useUiStore.getState().show({
      title: alert.title,
      message: alert.message,
      incidentId: alert.incidentId,
      tone: alert.critical ? "critical" : "info",
      sticky: alert.critical,
    });
  }
}
let provider: PushNotificationProvider = new InAppNotificationProvider();
/** Installs the delivery provider (called once at app start). */
export function setNotificationProvider(next: PushNotificationProvider) {
  provider = next;
}
export function notificationProvider() {
  return provider;
}
