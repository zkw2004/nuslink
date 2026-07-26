import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import { GlassButton } from "@components/shared";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
  type PushNotificationState,
} from "@services/index";

const STATE_COPY: Record<PushNotificationState, string> = {
  blocked: "Notifications are blocked in your device settings.",
  disabled: "Get timely updates for requests, invites, matches, and smart nudges.",
  enabled: "Push notifications are enabled on this device.",
  unsupported: "Push notifications are available in the iOS and Android apps.",
};

export function PushNotificationsCard() {
  const [state, setState] = useState<PushNotificationState>("disabled");
  const [isUpdating, setIsUpdating] = useState(true);

  useEffect(() => {
    void getPushNotificationState()
      .then(setState)
      .finally(() => setIsUpdating(false));
  }, []);

  async function handlePress() {
    setIsUpdating(true);
    try {
      const nextState =
        state === "enabled"
          ? (await disablePushNotifications(), "disabled" as const)
          : await enablePushNotifications();
      setState(nextState);
    } catch (error) {
      Alert.alert(
        "Push notifications unavailable",
        error instanceof Error ? error.message : "Please try again later.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold text-[#2A2A38]">
            Device notifications
          </Text>
          <Text className="text-[13px] leading-[18px] text-[#6E6E80]">
            {STATE_COPY[state]}
          </Text>
        </View>
        <View
          className={`h-2.5 w-2.5 rounded-full ${
            state === "enabled" ? "bg-[#4C9A73]" : "bg-[#AAAABC]"
          }`}
        />
      </View>
      {state !== "unsupported" ? (
        <GlassButton
          disabled={isUpdating || state === "blocked"}
          label={
            isUpdating
              ? "Updating..."
              : state === "enabled"
                ? "Turn off"
                : state === "blocked"
                  ? "Blocked in settings"
                  : "Enable push notifications"
          }
          onPress={() => {
            void handlePress();
          }}
          variant={state === "enabled" ? "light" : "dark"}
        />
      ) : null}
    </View>
  );
}
