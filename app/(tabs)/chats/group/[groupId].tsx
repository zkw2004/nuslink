import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";

import { AppAvatar, SectionCard } from "@components/shared";
import { useAuthStore, useGroupMessagesStore } from "@store/index";

function formatMessageTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGroupTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
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
      void loadGroupMessages(groupId, session.user.id);
    });
  }, [groupId, loadGroupMessages, refreshGroupChats, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !groupId) {
      return undefined;
    }

    return subscribeToGroup(groupId, session.user.id);
  }, [groupId, session?.user.id, subscribeToGroup]);

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

    const trimmedDraft = messageDraft.trim();
    if (!trimmedDraft) {
      return;
    }

    try {
      setMessageDraft("");
      await sendMessage(groupId, trimmedDraft, session.user.id);
    } catch (sendError) {
      setMessageDraft(trimmedDraft);
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <View className="border-b border-[#E4E9F1] bg-white px-5 pb-4 pt-2">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F4F8]"
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
              size={20}
              tintColor="#0F1115"
            />
          </Pressable>
          <AppAvatar name={group?.name ?? "Group"} size={44} rounded={false} />
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-[#0F1115]" numberOfLines={1}>
              {group?.name ?? "Group chat"}
            </Text>
            <Text className="mt-1 text-[13px] text-[#5C6370]" numberOfLines={1}>
              {group
                ? [group.module_code, formatGroupTypeLabel(group.type)]
                    .filter(Boolean)
                    .join(" · ")
                : "Loading group chat..."}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Group chat is not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {!error && messages.length === 0 && !isThreadLoading ? (
          <SectionCard>
            <Text className="text-[17px] font-bold text-[#0F1115]">No messages yet</Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Start the group conversation here. Everyone in the group can read
              messages in this thread.
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-3">
          {messages.map((message) => {
            const isMine = message.sender_id === session?.user.id;

            return (
              <View
                key={message.id}
                className={`max-w-[86%] ${isMine ? "self-end" : "self-start"}`}
              >
                {!isMine ? (
                  <Text className="mb-1 ml-1 text-[12px] font-semibold text-[#7B8494]">
                    {message.sender_profile.display_name}
                  </Text>
                ) : null}
                <View
                  className={`rounded-[18px] px-4 py-3 ${
                    isMine ? "bg-[#0F1115]" : "border border-[#E4E9F1] bg-white"
                  }`}
                >
                  <Text
                    className={`text-[15px] leading-6 ${
                      isMine ? "text-white" : "text-[#0F1115]"
                    }`}
                  >
                    {message.body}
                  </Text>
                  <Text
                    className={`mt-2 text-[11px] ${
                      isMine ? "text-white/60" : "text-[#9AA0AB]"
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

      <View className="border-t border-[#E4E9F1] bg-white px-5 py-3">
        <View className="flex-row items-end gap-3">
          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            placeholder="Write to the group"
            placeholderTextColor="#9AA0AB"
            multiline
            className="max-h-28 flex-1 rounded-[18px] border border-[#E4E9F1] bg-[#F9FBFD] px-4 py-3 text-[15px] text-[#0F1115]"
          />
          <Pressable
            disabled={isSending || !messageDraft.trim()}
            onPress={() => {
              void handleSendMessage();
            }}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              isSending || !messageDraft.trim() ? "bg-[#D7DDE6]" : "bg-[#0F1115]"
            }`}
          >
            <SymbolView
              name={{ ios: "paperplane.fill", android: "send", web: "send" }}
              size={18}
              tintColor="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
