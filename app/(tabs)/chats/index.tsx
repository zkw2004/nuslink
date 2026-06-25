import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import {
  AppAvatar,
  AppChip,
  AppScreenHeader,
  SectionCard,
} from "@components/shared";
import {
  useAuthStore,
  useCommunityMessagesStore,
  useDirectMessagesStore,
  useGroupMessagesStore,
} from "@store/index";

type InboxItem = {
  id: string;
  kind: "direct" | "group" | "community";
  title: string;
  subtitle: string;
  preview: string;
  timestamp: string | null;
  sortTimestamp: string;
  unreadCount: number;
  avatarUri?: string | null;
  roundedAvatar?: boolean;
};

function formatInboxTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-SG", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}

function formatGroupTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function ChatsScreen() {
  const session = useAuthStore((state) => state.session);
  const conversations = useDirectMessagesStore((state) => state.conversations);
  const connectedProfiles = useDirectMessagesStore((state) => state.connectedProfiles);
  const isInboxLoading = useDirectMessagesStore((state) => state.isInboxLoading);
  const error = useDirectMessagesStore((state) => state.error);
  const refreshInbox = useDirectMessagesStore((state) => state.refreshInbox);
  const openConversationWithUser = useDirectMessagesStore(
    (state) => state.openConversationWithUser,
  );
  const communityChats = useCommunityMessagesStore((state) => state.communityChats);
  const isCommunityChatsLoading = useCommunityMessagesStore((state) => state.isChatsLoading);
  const communityError = useCommunityMessagesStore((state) => state.error);
  const refreshCommunityChats = useCommunityMessagesStore(
    (state) => state.refreshCommunityChats,
  );
  const groupChats = useGroupMessagesStore((state) => state.groupChats);
  const isGroupChatsLoading = useGroupMessagesStore((state) => state.isChatsLoading);
  const groupError = useGroupMessagesStore((state) => state.error);
  const refreshGroupChats = useGroupMessagesStore((state) => state.refreshGroupChats);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void refreshInbox(session.user.id);
    void refreshCommunityChats(session.user.id);
    void refreshGroupChats(session.user.id);
  }, [refreshCommunityChats, refreshGroupChats, refreshInbox, session?.user.id]);

  const normalizedChatSearch = chatSearchQuery.trim().toLowerCase();
  const existingConversationUserIds = useMemo(
    () => new Set(conversations.map((conversation) => conversation.other_user.id)),
    [conversations],
  );
  const suggestedConnectedProfiles = useMemo(() => {
    if (!normalizedChatSearch) {
      return connectedProfiles.slice(0, 6);
    }

    return connectedProfiles.filter((profile) => {
      return (
        profile.display_name.toLowerCase().includes(normalizedChatSearch) ||
        profile.major?.toLowerCase().includes(normalizedChatSearch)
      );
    });
  }, [connectedProfiles, normalizedChatSearch]);

  const inboxItems = useMemo(() => {
    const directItems: InboxItem[] = conversations.map((conversation) => ({
      id: conversation.id,
      kind: "direct",
      title: conversation.other_user.display_name,
      subtitle: "Direct message",
      preview: conversation.last_message_preview ?? "Start the conversation here.",
      timestamp: conversation.last_message_at,
      sortTimestamp: conversation.last_message_at ?? conversation.updated_at,
      unreadCount: conversation.unread_count,
      avatarUri: conversation.other_user.avatar_url,
      roundedAvatar: true,
    }));

    const groupItems: InboxItem[] = groupChats.map((group) => ({
      id: group.id,
      kind: "group",
      title: group.name,
      subtitle: [group.module_code, formatGroupTypeLabel(group.type)]
        .filter(Boolean)
        .join(" · ") || "Group chat",
      preview: group.last_message_preview ?? "No messages yet. Start the group chat.",
      timestamp: group.last_message_at,
      sortTimestamp: group.last_message_at ?? group.created_at,
      unreadCount: group.unread_count,
      roundedAvatar: false,
    }));

    const communityItems: InboxItem[] = communityChats.map((community) => ({
      id: community.id,
      kind: "community",
      title: community.name,
      subtitle: "Community chat",
      preview:
        community.last_message_preview ??
        "No messages yet. Start the community conversation.",
      timestamp: community.last_message_at,
      sortTimestamp: community.last_message_at ?? community.created_at,
      unreadCount: community.unread_count,
      roundedAvatar: false,
    }));

    return [...directItems, ...groupItems, ...communityItems].sort(
      (left, right) =>
        new Date(right.sortTimestamp).getTime() -
        new Date(left.sortTimestamp).getTime(),
    );
  }, [communityChats, conversations, groupChats]);

  const isAnyInboxLoading =
    isInboxLoading || isCommunityChatsLoading || isGroupChatsLoading;

  async function handleStartConversation(otherUserId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before opening chats.");
      return;
    }

    try {
      const conversationId = await openConversationWithUser(
        otherUserId,
        session.user.id,
      );
      setIsCreateChatOpen(false);
      setChatSearchQuery("");
      router.push(`/chats/${conversationId}` as never);
    } catch (openError) {
      Alert.alert(
        "Could not open chat",
        openError instanceof Error ? openError.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Chats"
        subtitle="Keep up with group chats, community spaces, and direct messages in one inbox."
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <Text className="text-[17px] font-bold text-[#0F1115]">
            Mutual connections only
          </Text>
          <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
            Message threads can only be opened with users who are already in your
            accepted connections list from the People tab.
          </Text>
        </SectionCard>

        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Chats are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {communityError ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Community chats are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">
              {communityError}
            </Text>
          </SectionCard>
        ) : null}

        {groupError ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Group chats are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">
              {groupError}
            </Text>
          </SectionCard>
        ) : null}

        {!error ? (
          <View className="mb-4 items-end">
            <Pressable
              onPress={() => {
                setIsCreateChatOpen((current) => !current);
                setChatSearchQuery("");
              }}
              className="h-12 w-12 items-center justify-center rounded-full bg-[#0F1115]"
            >
              <SymbolView
                name={isCreateChatOpen ? "xmark" : "plus"}
                size={18}
                tintColor="#FFFFFF"
              />
            </Pressable>

            {isCreateChatOpen ? (
              <SectionCard className="mt-3 w-full">
                <View>
                <TextInput
                  value={chatSearchQuery}
                  onChangeText={setChatSearchQuery}
                  placeholder="Search connected people"
                  placeholderTextColor="#9AA0AB"
                  className="rounded-[14px] border border-[#E4E9F1] bg-[#F9FBFD] px-4 py-4 text-[15px] text-[#0F1115]"
                />

                {connectedProfiles.length === 0 ? (
                  <View className="mt-3 rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] px-4 py-4">
                    <Text className="text-[14px] leading-6 text-[#5C6370]">
                      No mutual connections are available for direct messages yet.
                    </Text>
                  </View>
                ) : suggestedConnectedProfiles.length > 0 ? (
                  <View className="mt-3 gap-3">
                    {suggestedConnectedProfiles.map((profile) => {
                      const hasExistingChat = existingConversationUserIds.has(profile.id);

                      return (
                        <Pressable
                          key={profile.id}
                          disabled={hasExistingChat}
                          onPress={() => {
                            if (!hasExistingChat) {
                              void handleStartConversation(profile.id);
                            }
                          }}
                          className={`rounded-[16px] border p-3 ${
                            hasExistingChat
                              ? "border-[#E8ECF2] bg-[#F1F3F7]"
                              : "border-[#E4E9F1] bg-[#F7F9FC]"
                          }`}
                        >
                          <View className="flex-row items-center gap-3">
                            <AppAvatar
                              name={profile.display_name}
                              imageUri={profile.avatar_url}
                              size={46}
                            />
                            <View className="flex-1">
                              <Text
                                className={`text-[15px] font-bold ${
                                  hasExistingChat ? "text-[#8B93A1]" : "text-[#0F1115]"
                                }`}
                              >
                                {profile.display_name}
                              </Text>
                              <Text
                                className={`mt-1 text-[13px] ${
                                  hasExistingChat ? "text-[#98A0AD]" : "text-[#5C6370]"
                                }`}
                              >
                                {[
                                  profile.major,
                                  profile.year_of_study
                                    ? `Year ${profile.year_of_study}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                  "Mutual connection ready for direct messages"}
                              </Text>
                            </View>
                            <AppChip
                              label={hasExistingChat ? "Existing chat" : "Create"}
                              variant="outline"
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View className="mt-3 rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] px-4 py-4">
                    <Text className="text-[14px] leading-6 text-[#5C6370]">
                      No connected person matches that search yet.
                    </Text>
                  </View>
                )}
                </View>
              </SectionCard>
            ) : null}
          </View>
        ) : null}

        {inboxItems.length > 0 ? (
          <>
            <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
              Inbox
            </Text>

            <View className="mb-4 gap-4">
              {inboxItems.map((item) => (
                <Pressable
                  key={`${item.kind}:${item.id}`}
                  onPress={() => {
                    if (item.kind === "direct") {
                      router.push(`/chats/${item.id}` as never);
                      return;
                    }

                    if (item.kind === "group") {
                      router.push(`/chats/group/${item.id}` as never);
                      return;
                    }

                    router.push(`/chats/community/${item.id}` as never);
                  }}
                >
                  <SectionCard>
                    <View className="flex-row items-center gap-3">
                      <AppAvatar
                        name={item.title}
                        imageUri={item.avatarUri}
                        size={52}
                        rounded={item.roundedAvatar ?? true}
                      />
                      <View className="flex-1">
                        <View className="flex-row items-start gap-3">
                          <View className="flex-1">
                            <Text
                              className="text-[16px] font-bold text-[#0F1115]"
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text className="mt-1 text-[12px] font-semibold uppercase tracking-[0.4px] text-[#9AA0AB]">
                              {item.subtitle}
                            </Text>
                          </View>
                          <View className="items-end gap-2">
                            <Text className="text-[12px] text-[#9AA0AB]">
                              {formatInboxTime(item.timestamp)}
                            </Text>
                            {item.unreadCount > 0 ? (
                              <View className="min-w-6 items-center rounded-full bg-[#0F1115] px-2 py-1">
                                <Text className="text-[11px] font-bold text-white">
                                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Text className="mt-2 text-[13px] text-[#5C6370]" numberOfLines={1}>
                          {item.preview}
                        </Text>
                      </View>
                    </View>
                  </SectionCard>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {!error &&
        !communityError &&
        !groupError &&
        inboxItems.length === 0 &&
        !isAnyInboxLoading ? (
          <SectionCard className="mt-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No chats yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Join a group or community from Discover, or connect with someone in
              People to start a direct message.
            </Text>
          </SectionCard>
        ) : null}

        {!groupError && groupChats.length === 0 && !isGroupChatsLoading ? (
          <SectionCard className="mt-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No group chats yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Join or accept an invite to a group to unlock its member chat here.
            </Text>
          </SectionCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
