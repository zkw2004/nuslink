import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";

import { markNotificationAsRead } from "@services/notificationsService";
import { syncPushNotificationRegistration } from "@services/pushNotificationsService";
import { useAuthStore } from "@store/index";

function openNotification(response: NotificationResponse) {
  const data = response.notification.request.content.data ?? {};
  const notificationId = data.notificationId;
  const href = data.href;

  if (typeof notificationId === "string") {
    void markNotificationAsRead(notificationId).catch(() => undefined);
  }
  if (typeof href === "string" && href.startsWith("/")) {
    router.push(href as never);
  } else {
    router.push("/(tabs)/notifications" as never);
  }
}

export function usePushNotifications() {
  const userId = useAuthStore((state) => state.session?.user.id);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void syncPushNotificationRegistration().catch(() => undefined);
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openNotification);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      openNotification(lastResponse);
      Notifications.clearLastNotificationResponse();
    }

    return () => {
      responseSubscription.remove();
    };
  }, [userId]);
}
