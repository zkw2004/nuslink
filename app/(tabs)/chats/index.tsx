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
import { useAuthStore, useDirectMessagesStore } from "@store/index";

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
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void refreshInbox(session.user.id);
  }, [refreshInbox, session?.user.id]);

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
                        <Text className="text-[16px] font-bold text-[#0F1115]">
                          {conversation.other_user.display_name}
                        </Text>
                        <Text className="mt-1 text-[13px] text-[#5C6370]">
                          {conversation.last_message_preview ?? "Start the conversation here."}
                        </Text>
                      </View>
                    </View>
                  </SectionCard>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
