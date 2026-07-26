export type PushNotificationState =
  | "blocked"
  | "disabled"
  | "enabled"
  | "unsupported";

export async function getPushNotificationState(): Promise<PushNotificationState> {
  return "unsupported";
}

export async function enablePushNotifications(): Promise<PushNotificationState> {
  return "unsupported";
}

export async function disablePushNotifications() {}

export async function unregisterStoredPushToken() {}

export async function syncPushNotificationRegistration() {}
