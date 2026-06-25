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
import { useAuthStore, useGroupMessagesStore } from "@store/index";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GroupChatThreadScreen() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";
  const session = useAuthStore((state) => state.session);
  const groupChats = useGroupMessagesStore((state) => state.groupChats);
  const messagesByGroup = useGroupMessagesStore((state) => state.messagesByGroup);
  const isThreadLoading = useGroupMessagesStore((state) => state.isThreadLoading);
  const isSending = useGroupMessagesStore((state) => state.isSending);
  const error = useGroupMessagesStore((state) => state.error);
  const refreshGroupChats = useGroupMessagesStore((state) => state.refreshGroupChats);
  const loadGroupMessages = useGroupMessagesStore((state) => state.loadGroupMessages);
  const sendMessage = useGroupMessagesStore((state) => state.sendMessage);
  const subscribeToGroup = useGroupMessagesStore((state) => state.subscribeToGroup);
  const [messageDraft, setMessageDraft] = useState("");
  const scrollViewRef = useRef<ScrollView | null>(null);

  const group = useMemo(
    () => groupChats.find((item) => item.id === groupId) ?? null,
    [groupChats, groupId],
  );
  const messages = useMemo(
    () => messagesByGroup[groupId] ?? [],
    [groupId, messagesByGroup],
  );

  useEffect(() => {
    if (!session?.user.id || !groupId) {
      return;
    }

    void refreshGroupChats(session.user.id).then(() => {
      void loadGroupMessages(groupId);
    });
  }, [groupId, loadGroupMessages, refreshGroupChats, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !groupId) {
      return undefined;
    }

    return subscribeToGroup(groupId, session.user.id);
  }, [groupId, session?.user.id, subscribeToGroup]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

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
      await sendMessage(groupId, messageDraft.trim(), session.user.id);
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

          {group ? (
            <View className="flex-1 rounded-[20px] bg-white px-4 py-3">
              <View className="flex-row items-center gap-3">
                <AppAvatar name={group.name} size={44} rounded={false} />
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-[16px] font-bold text-[#0F1115]">
                      {group.name}
                    </Text>
                    <AppChip
                      label={group.privacy === "private" ? "Private" : "Group"}
                      variant="outline"
                    />
                  </View>
                  <Text className="mt-1 text-[12px] text-[#5C6370]">
                    {group.module_code
                      ? `${group.module_code} member chat`
                      : "Group member chat"}
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
              Group chat unavailable
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {!error && !group && !isThreadLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Could not find this group chat
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Return to the Chats tab and open the group again.
            </Text>
          </SectionCard>
        ) : null}

        {!error && messages.length === 0 && group ? (
          <SectionCard>
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Start the group chat
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Messages sent here are visible to members of this group.
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-3">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === session?.user.id;

            return (
              <View
                key={message.id}
                className={`max-w-[86%] ${
                  isOwnMessage ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isOwnMessage ? (
                  <Text className="mb-1 px-2 text-[11px] font-semibold text-[#7B8494]">
                    {message.sender_profile.display_name}
                  </Text>
                ) : null}
                <View
                  className={`rounded-[20px] px-4 py-3 ${
                    isOwnMessage ? "bg-[#0F1115]" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-[15px] leading-6 ${
                      isOwnMessage ? "text-white" : "text-[#0F1115]"
                    }`}
                  >
                    {message.body}
                  </Text>
                  <Text
                    className={`mt-2 text-[11px] ${
                      isOwnMessage ? "text-[#C9CED8]" : "text-[#8B93A1]"
                    }`}
                  >
                    {formatMessageTime(message.created_at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="border-t border-[#DDE5EF] bg-[#EEF3F9] px-5 py-4">
        <View className="rounded-[24px] bg-white p-3">
          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            placeholder="Write to the group"
            placeholderTextColor="#9AA0AB"
            multiline
            className="min-h-[56px] text-[15px] leading-6 text-[#0F1115]"
          />
          <AppButton
            label={isSending ? "Sending..." : "Send"}
            disabled={isSending || !messageDraft.trim()}
            onPress={() => {
              void handleSendMessage();
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
