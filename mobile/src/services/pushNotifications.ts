// A platform-neutral boundary for a future FCM/APNs provider.
export interface PushNotificationProvider {
  register(): Promise<string | null>;
  unregister(): Promise<void>;
}
export class InAppNotificationProvider implements PushNotificationProvider {
  async register() {
    return null;
  }
  async unregister() {}
}
