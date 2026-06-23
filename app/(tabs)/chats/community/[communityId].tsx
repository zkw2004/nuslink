import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { AppAvatar, AppButton, AppChip, SectionCard } from "@components/shared";
import { useAuthStore, useCommunityMessagesStore } from "@store/index";

function formatMessageTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommunityChatThreadScreen() {
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communityId = typeof params.communityId === "string" ? params.communityId : "";
  const session = useAuthStore((state) => state.session);
  const communityChats = useCommunityMessagesStore((state) => state.communityChats);
  const messagesByCommunity = useCommunityMessagesStore(
    (state) => state.messagesByCommunity,
  );
  const isThreadLoading = useCommunityMessagesStore((state) => state.isThreadLoading);
  const isSending = useCommunityMessagesStore((state) => state.isSending);
  const error = useCommunityMessagesStore((state) => state.error);
  const refreshCommunityChats = useCommunityMessagesStore(
    (state) => state.refreshCommunityChats,
  );
  const loadCommunityMessages = useCommunityMessagesStore(
    (state) => state.loadCommunityMessages,
  );
  const sendMessage = useCommunityMessagesStore((state) => state.sendMessage);
  const subscribeToCommunity = useCommunityMessagesStore(
    (state) => state.subscribeToCommunity,
  );

  const [messageDraft, setMessageDraft] = useState("");
  const scrollViewRef = useRef<ScrollView | null>(null);

  const community = useMemo(
    () => communityChats.find((item) => item.id === communityId) ?? null,
    [communityChats, communityId],
  );
  const messages = messagesByCommunity[communityId] ?? [];

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return;
    }

    void refreshCommunityChats(session.user.id).then(() => {
      void loadCommunityMessages(communityId);
    });
  }, [communityId, loadCommunityMessages, refreshCommunityChats, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return undefined;
    }

    return subscribeToCommunity(communityId, session.user.id);
  }, [communityId, session?.user.id, subscribeToCommunity]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [messages.length]);

  async function handleSendMessage() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before sending messages.");
      return;
    }

    if (!messageDraft.trim()) {
      Alert.alert("Write a message", "Type something before sending.");
      return;
    }

    try {
      await sendMessage(communityId, messageDraft, session.user.id);
      setMessageDraft("");
    } catch (sendError) {
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <View className="px-5 pb-4 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.replace("/(tabs)/chats")}
            className="rounded-full bg-white px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-[#0F1115]">Back</Text>
          </Pressable>

          {community ? (
            <View className="flex-1 rounded-[20px] bg-white px-4 py-3">
              <View className="flex-row items-center gap-3">
                <AppAvatar name={community.name} size={44} rounded={false} />
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-[16px] font-bold text-[#0F1115]">
                      {community.name}
                    </Text>
                    <AppChip
                      label={community.join_policy === "open" ? "Open join" : "Approval"}
                      variant="outline"
                    />
                  </View>
                  <Text className="mt-1 text-[12px] text-[#5C6370]">
                    Community member chat
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={(ref) => {
          scrollViewRef.current = ref;
        }}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Community chat unavailable
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {!error && !community && !isThreadLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Could not find this community chat
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Return to Discover or the Chats tab and open the community again.
            </Text>
          </SectionCard>
        ) : null}

        {!error && community && messages.length === 0 && !isThreadLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No messages yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Send the first message to kick off this community space.
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-3">
          {messages.map((message) => {
            const isCurrentUser = message.sender_id === session?.user.id;

            return (
              <View
                key={message.id}
                className={`max-w-[88%] rounded-[18px] px-4 py-3 ${
                  isCurrentUser ? "self-end bg-[#0F1115]" : "self-start bg-white"
                }`}
              >
                {!isCurrentUser ? (
                  <View className="mb-2 flex-row items-center gap-2">
                    <AppAvatar
                      name={message.sender_profile.display_name}
                      imageUri={message.sender_profile.avatar_url}
                      size={28}
                    />
                    <Text className="text-[12px] font-semibold text-[#5C6370]">
                      {message.sender_profile.display_name}
                    </Text>
                  </View>
                ) : null}

                <Text
                  className={`text-[14px] leading-6 ${
                    isCurrentUser ? "text-white" : "text-[#0F1115]"
                  }`}
                >
                  {message.body}
                </Text>
                <Text
                  className={`mt-2 text-[11px] ${
                    isCurrentUser ? "text-[#C9D0DB]" : "text-[#7B8494]"
                  }`}
                >
                  {formatMessageTime(message.created_at)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="border-t border-[#DDE5EF] bg-[#EEF3F9] px-5 pb-6 pt-4">
        <View className="rounded-[22px] bg-white p-3">
          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            placeholder="Write to the community"
            placeholderTextColor="#9AA0AB"
            multiline
            className="min-h-[52px] text-[14px] leading-6 text-[#0F1115]"
          />

          <View className="mt-3">
            <AppButton
              label={isSending ? "Sending..." : "Send"}
              disabled={isSending || !community}
              onPress={() => {
                void handleSendMessage();
              }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
