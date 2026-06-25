import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppScreenHeader, SectionCard } from "@components/shared";
import type { AppNotification, NotificationType } from "@appTypes/index";
import { useAuthStore, useNotificationsStore } from "@store/index";

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  connection_request: "Request",
  connection_accepted: "Connection",
  connection_milestone: "Milestone",
  high_match: "Match",
  group_invite_code: "Invite code",
  group_invite_received: "Invitation",
  group_member_joined: "Group activity",
  resource_shared: "Resource",
  system_announcement: "Announcement",
};

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: (notificationId: string) => void;
}) {
  const isUnread = notification.read_at === null;

  return (
    <Pressable
      className={`rounded-[24px] border px-4 py-4 ${
        isUnread
          ? "border-[#B9CBE1] bg-white"
          : "border-[#E4E9F1] bg-[#F7F9FC]"
      }`}
      onPress={() => {
        if (isUnread) {
          onMarkRead(notification.id);
        }
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[0.7px] text-[#5B7BA3]">
              {NOTIFICATION_LABELS[notification.type]}
            </Text>
            {isUnread ? (
              <View className="rounded-full bg-[#0F1115] px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase text-white">
                  New
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-2 text-[16px] font-bold text-[#0F1115]">
            {notification.title}
          </Text>
          <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
            {notification.body}
          </Text>
        </View>
        <Text className="text-right text-[12px] font-medium text-[#9AA0AB]">
          {formatNotificationTime(notification.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const session = useAuthStore((state) => state.session);
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const refreshNotifications = useNotificationsStore(
    (state) => state.refreshNotifications,
  );
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void refreshNotifications(session.user.id);
  }, [refreshNotifications, session?.user.id]);

  function handleMarkRead(notificationId: string) {
    if (!session?.user.id) {
      return;
    }

    void markAsRead(notificationId, session.user.id);
  }

  function handleMarkAllRead() {
    if (!session?.user.id || unreadCount === 0) {
      return;
    }

    void markAllAsRead(session.user.id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Notifications"
        subtitle="High-signal updates for requests, matches, groups, and resources."
        hideNotificationsAction
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[18px] font-bold text-[#0F1115]">
                {unreadCount === 0
                  ? "All caught up"
                  : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
              </Text>
              <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
                Keep track of important app activity from one place.
              </Text>
            </View>
            <AppButton
              label="Mark all read"
              variant="secondary"
              disabled={unreadCount === 0}
              onPress={handleMarkAllRead}
            />
          </View>
        </SectionCard>

        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Notifications are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">
              {error}
            </Text>
          </SectionCard>
        ) : null}

        {isLoading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#5B7BA3" />
          </View>
        ) : null}

        {!error && notifications.length === 0 && !isLoading ? (
          <SectionCard>
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No notifications yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Connection requests, match recommendations, group updates, resources, and announcements will appear here.
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
