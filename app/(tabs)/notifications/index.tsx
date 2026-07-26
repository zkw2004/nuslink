import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppButton, AppScreenHeader, SectionCard } from "@components/shared";
import type { AppNotification, NotificationType } from "@appTypes/index";
import {
  respondToGroupInvitation,
  respondToGroupJoinRequest,
} from "@services/notificationsService";
import {
  useAuthStore,
  useConnectionsStore,
  useDirectMessagesStore,
  useGroupMessagesStore,
  useGroupsStore,
  useNotificationsStore,
} from "@store/index";

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  connection_request: "Request",
  connection_accepted: "Connection",
  connection_milestone: "Milestone",
  high_match: "Match",
  group_invite_received: "Invitation",
  group_join_requested: "Join request",
  group_join_accepted: "Group access",
  group_member_joined: "Group activity",
  resource_shared: "Resource",
  system_announcement: "Announcement",
  nudge_time: "Semester nudge",
  nudge_behaviour: "Next step",
  nudge_network: "Network nudge",
};

function getNotificationLabel(type: string) {
  return NOTIFICATION_LABELS[type as NotificationType] ?? "Notification";
}

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
  onRespondConnectionRequest,
  onRespondGroupInvite,
  onRespondJoinRequest,
  actionLoadingId,
}: {
  notification: AppNotification;
  onMarkRead: (notificationId: string) => void;
  onRespondConnectionRequest: (
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) => void;
  onRespondGroupInvite: (
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) => void;
  onRespondJoinRequest: (
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) => void;
  actionLoadingId: string | null;
}) {
  const isUnread = notification.read_at === null;
  const isConnectionRequest = notification.type === "connection_request";
  const isGroupInvite = notification.type === "group_invite_received";
  const isJoinRequest = notification.type === "group_join_requested";
  const isNudge = notification.type.startsWith("nudge_");
  const canRespond =
    isUnread && (isConnectionRequest || isGroupInvite || isJoinRequest);
  const handleRespond = isConnectionRequest
    ? onRespondConnectionRequest
    : isGroupInvite
      ? onRespondGroupInvite
      : onRespondJoinRequest;

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
        if (isNudge && notification.href) {
          router.push(notification.href as never);
        }
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[0.7px] text-[#5B7BA3]">
              {getNotificationLabel(notification.type)}
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
          {canRespond ? (
            <View className="mt-4 flex-row gap-2">
              <AppButton
                label={
                  actionLoadingId === `${notification.id}:accepted`
                    ? isConnectionRequest
                      ? "Accepting..."
                      : isJoinRequest
                      ? "Approving..."
                      : "Joining..."
                    : isConnectionRequest || isGroupInvite
                      ? "Accept"
                      : isJoinRequest
                      ? "Approve"
                      : "Accept"
                }
                disabled={actionLoadingId !== null}
                onPress={() => handleRespond(notification, "accepted")}
              />
              <AppButton
                label={
                  actionLoadingId === `${notification.id}:declined`
                    ? "Declining..."
                    : "Decline"
                }
                variant="secondary"
                disabled={actionLoadingId !== null}
                onPress={() => handleRespond(notification, "declined")}
              />
            </View>
          ) : null}
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
  const handleConnectionRequest = useConnectionsStore(
    (state) => state.handleConnectionRequest,
  );
  const refreshGroups = useGroupsStore((state) => state.refreshGroups);
  const refreshGroupChats = useGroupMessagesStore((state) => state.refreshGroupChats);
  const refreshInbox = useDirectMessagesStore((state) => state.refreshInbox);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  async function handleRespondConnectionRequest(
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) {
    if (!session?.user.id) {
      return;
    }

    const requestId = notification.metadata.request_id;
    if (typeof requestId !== "string") {
      Alert.alert(
        "Could not handle request",
        "This notification is missing its connection request details.",
      );
      return;
    }

    setActionLoadingId(`${notification.id}:${decision}`);

    try {
      await handleConnectionRequest(requestId, decision, session.user.id);
      await markAsRead(notification.id, session.user.id);
      await refreshInbox(session.user.id);
    } catch (error) {
      Alert.alert(
        "Could not handle request",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRespondGroupInvite(
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) {
    if (!session?.user.id) {
      return;
    }

    const invitationId = notification.metadata.invitation_id;
    if (typeof invitationId !== "string") {
      Alert.alert(
        "Could not handle invitation",
        "This notification is missing its invitation details.",
      );
      return;
    }

    setActionLoadingId(`${notification.id}:${decision}`);

    try {
      await respondToGroupInvitation(invitationId, decision);
      await markAsRead(notification.id, session.user.id);
      await Promise.all([
        refreshGroups(session.user.id),
        refreshGroupChats(session.user.id),
      ]);
    } catch (error) {
      Alert.alert(
        "Could not handle invitation",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRespondJoinRequest(
    notification: AppNotification,
    decision: "accepted" | "declined",
  ) {
    if (!session?.user.id) {
      return;
    }

    const requestId = notification.metadata.join_request_id;
    if (typeof requestId !== "string") {
      Alert.alert(
        "Could not handle request",
        "This notification is missing its request details.",
      );
      return;
    }

    setActionLoadingId(`${notification.id}:${decision}`);

    try {
      await respondToGroupJoinRequest(requestId, decision);
      await markAsRead(notification.id, session.user.id);
      await Promise.all([
        refreshGroups(session.user.id),
        refreshGroupChats(session.user.id),
      ]);
    } catch (error) {
      Alert.alert(
        "Could not handle request",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Notifications"
        subtitle="High-signal updates, including the smart nudges you control."
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
              onRespondConnectionRequest={(targetNotification, decision) => {
                void handleRespondConnectionRequest(targetNotification, decision);
              }}
              onRespondGroupInvite={(targetNotification, decision) => {
                void handleRespondGroupInvite(targetNotification, decision);
              }}
              onRespondJoinRequest={(targetNotification, decision) => {
                void handleRespondJoinRequest(targetNotification, decision);
              }}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
