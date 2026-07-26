import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@lib/supabase";

const PUSH_ENABLED_KEY = "nuslink.push.enabled";
const PUSH_TOKEN_KEY = "nuslink.push.expo-token";
const ANDROID_CHANNEL_ID = "nuslink-updates";

export type PushNotificationState =
  | "blocked"
  | "disabled"
  | "enabled"
  | "unsupported";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "NUSLink updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#5B4FE0",
  });
}

async function getAndSaveExpoPushToken() {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("The EAS project ID is missing from the app configuration.");
  }

  await configureAndroidChannel();
  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, response.data);
  return response.data;
}

async function registerToken(expoPushToken: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    throw new Error("Push notifications require the iOS or Android app.");
  }

  const { error } = await supabase.rpc("register_push_token", {
    expo_push_token_input: expoPushToken,
    platform_input: Platform.OS,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getPushNotificationState(): Promise<PushNotificationState> {
  const enabled = (await AsyncStorage.getItem(PUSH_ENABLED_KEY)) === "true";
  if (!enabled) {
    return "disabled";
  }

  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) {
    return "enabled";
  }
  return permission.canAskAgain ? "disabled" : "blocked";
}

export async function enablePushNotifications(): Promise<PushNotificationState> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    await AsyncStorage.setItem(PUSH_ENABLED_KEY, "false");
    return permission.canAskAgain ? "disabled" : "blocked";
  }

  const token = await getAndSaveExpoPushToken();
  await registerToken(token);
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, "true");
  return "enabled";
}

export async function disablePushNotifications() {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, "false");
  await unregisterStoredPushToken();
}

export async function unregisterStoredPushToken() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token || !supabase) {
    return;
  }

  const { error } = await supabase.rpc("unregister_push_token", {
    expo_push_token_input: token,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function syncPushNotificationRegistration() {
  const enabled = (await AsyncStorage.getItem(PUSH_ENABLED_KEY)) === "true";
  if (!enabled) {
    return;
  }
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    return;
  }

  const token = await getAndSaveExpoPushToken();
  await registerToken(token);
}
