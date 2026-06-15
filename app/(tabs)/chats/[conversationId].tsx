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
import { router, useLocalSearchParams } from "expo-router";

import { AppAvatar, AppButton, BadgeTierPill, SectionCard } from "@components/shared";
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

function formatMessageTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ConversationThreadScreen() {
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : "";
  const session = useAuthStore((state) => state.session);
  const conversations = useDirectMessagesStore((state) => state.conversations);
  const messagesByConversation = useDirectMessagesStore(
    (state) => state.messagesByConversation,
  );
  const isThreadLoading = useDirectMessagesStore((state) => state.isThreadLoading);
  const isSending = useDirectMessagesStore((state) => state.isSending);
  const error = useDirectMessagesStore((state) => state.error);
  const refreshInbox = useDirectMessagesStore((state) => state.refreshInbox);
  const loadConversationMessages = useDirectMessagesStore(
    (state) => state.loadConversationMessages,
  );
  const sendMessage = useDirectMessagesStore((state) => state.sendMessage);

  const [messageDraft, setMessageDraft] = useState("");

  const conversation = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversationId, conversations],
  );
  const messages = messagesByConversation[conversationId] ?? [];

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return;
    }

    void refreshInbox(session.user.id).then(() => {
      void loadConversationMessages(conversationId);
    });
  }, [conversationId, loadConversationMessages, refreshInbox, session?.user.id]);

  async function handleSendMessage() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before sending messages.");
      return;
    }

    const trimmedMessage = messageDraft.trim();

    if (!trimmedMessage) {
      Alert.alert("Write a message", "Type something before sending.");
      return;
    }

    try {
      await sendMessage(conversationId, trimmedMessage, session.user.id);
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
            onPress={() => router.back()}
            className="rounded-full bg-white px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-[#0F1115]">Back</Text>
          </Pressable>

          {conversation ? (
            <View className="flex-1 flex-row items-center gap-3 rounded-[20px] bg-white px-4 py-3">
              <AppAvatar
                name={conversation.other_user.display_name}
                imageUri={conversation.other_user.avatar_url}
                size={44}
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
                <Text className="mt-1 text-[12px] text-[#5C6370]">
                  Mutual connection direct message
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Conversation unavailable
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {!error && !conversation && !isThreadLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Could not find this conversation
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Return to the Chats inbox and open the thread again from your mutual connections.
            </Text>
          </SectionCard>
        ) : null}

        {!error && conversation && messages.length === 0 && !isThreadLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              No messages yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Send the first message to start this direct conversation.
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
                  isCurrentUser
                    ? "self-end bg-[#0F1115]"
                    : "self-start bg-white"
                }`}
              >
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
            placeholder="Write a message"
            placeholderTextColor="#9AA0AB"
            multiline
            className="min-h-[52px] text-[14px] leading-6 text-[#0F1115]"
          />

          <View className="mt-3">
            <AppButton
              label={isSending ? "Sending..." : "Send"}
              disabled={isSending || !conversation}
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
