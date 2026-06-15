import { useEffect } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  AppAvatar,
  AppButton,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  SectionCard,
} from "@components/shared";
import { useAuthStore, useDirectMessagesStore } from "@store/index";

function toBadgeTierLabel(tier: "bronze" | "silver" | "gold" | null) {
  switch (tier) {
    case "gold":
      return "Standout" as const;
    case "silver":
      return "Trusted" as const;
    case "bronze":
      return "Reliable" as const;
    default:
      return "New" as const;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void refreshInbox(session.user.id);
  }, [refreshInbox, session?.user.id]);

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
        subtitle="Direct messages unlock once both users have accepted the connection."
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

        {!error && conversations.length === 0 && connectedProfiles.length === 0 && !isInboxLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No mutual connections yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Accept or send connection requests in the People tab first, then your
              direct-message inbox will appear here.
            </Text>
          </SectionCard>
        ) : null}

        {conversations.length > 0 ? (
          <>
            <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
              Conversations
            </Text>

            <View className="mb-4 gap-4">
              {conversations.map((conversation) => (
                <Pressable
                  key={conversation.id}
                  onPress={() => {
                    router.push(`/chats/${conversation.id}` as never);
                  }}
                >
                  <SectionCard>
                    <View className="flex-row items-center gap-3">
                      <AppAvatar
                        name={conversation.other_user.display_name}
                        imageUri={conversation.other_user.avatar_url}
                        size={52}
                      />
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-[16px] font-bold text-[#0F1115]">
                            {conversation.other_user.display_name}
                          </Text>
                          <BadgeTierPill
                            tier={toBadgeTierLabel(conversation.other_user.badge_tier)}
                          />
                        </View>
                        <Text className="mt-1 text-[13px] text-[#5C6370]">
                          {conversation.last_message_preview ?? "Start the conversation here."}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-[12px] text-[#7B8494]">
                        {formatTimestamp(conversation.last_message_at)}
                      </Text>
                      <AppChip label="Open chat" variant="outline" />
                    </View>
                  </SectionCard>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {connectedProfiles.length > 0 ? (
          <>
            <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
              Connected people
            </Text>

            <View className="gap-4">
              {connectedProfiles.map((profile) => (
                <SectionCard key={profile.id}>
                  <View className="flex-row items-center gap-3">
                    <AppAvatar
                      name={profile.display_name}
                      imageUri={profile.avatar_url}
                      size={52}
                    />
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-[16px] font-bold text-[#0F1115]">
                          {profile.display_name}
                        </Text>
                        <BadgeTierPill tier={toBadgeTierLabel(profile.badge_tier)} />
                      </View>
                      <Text className="mt-1 text-[13px] text-[#5C6370]">
                        {[
                          profile.major,
                          profile.year_of_study ? `Year ${profile.year_of_study}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Mutual connection ready for direct messages"}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3">
                    <AppButton
                      label="Start chat"
                      onPress={() => {
                        void handleStartConversation(profile.id);
                      }}
                    />
                  </View>
                </SectionCard>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
