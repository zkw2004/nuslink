import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";

import { AppAvatar, AppButton, SectionCard } from "@components/shared";
import {
  ChatPollCard,
  PinnedMessagesDrawer,
  PollComposer,
  type PinnedMessagePreview,
} from "@features/chat/ChatFeaturePanels";
import {
  useAuthStore,
  useChatFeaturesStore,
  useGroupMessagesStore,
} from "@store/index";

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
  const pollsByMessageId = useChatFeaturesStore((state) => state.pollsByMessageId);
  const pinnedMessagesByChatKey = useChatFeaturesStore(
    (state) => state.pinnedMessagesByChatKey,
  );
  const isCreatingPoll = useChatFeaturesStore((state) => state.isCreatingPoll);
  const isVoting = useChatFeaturesStore((state) => state.isVoting);
  const isPinning = useChatFeaturesStore((state) => state.isPinning);
  const loadFeatures = useChatFeaturesStore((state) => state.loadFeatures);
  const createPoll = useChatFeaturesStore((state) => state.createPoll);
  const votePoll = useChatFeaturesStore((state) => state.votePoll);
  const unvotePoll = useChatFeaturesStore((state) => state.unvotePoll);
  const setPinned = useChatFeaturesStore((state) => state.setPinned);
  const subscribeToFeatureChanges = useChatFeaturesStore(
    (state) => state.subscribeToFeatureChanges,
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const group = useMemo(
    () => groupChats.find((item) => item.id === groupId) ?? null,
    [groupChats, groupId],
  );
  const messages = useMemo(
    () => messagesByGroup[groupId] ?? [],
    [groupId, messagesByGroup],
  );
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
  const chatKey = `group:${groupId}`;
  const pinnedMessages = pinnedMessagesByChatKey[chatKey] ?? [];

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
    if (!session?.user.id || !groupId) {
      return;
    }

    void loadFeatures("group", groupId, messageIds, session.user.id);
  }, [groupId, loadFeatures, messageIds, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !groupId) {
      return undefined;
    }

    return subscribeToFeatureChanges("group", groupId, messageIds, session.user.id);
  }, [groupId, messageIds, session?.user.id, subscribeToFeatureChanges]);

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

  function resetPollComposer() {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setIsPollComposerOpen(false);
  }

  async function handleCreatePoll() {
    const trimmedQuestion = pollQuestion.trim();
    const trimmedOptions = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before creating polls.");
      return;
    }

    if (!trimmedQuestion) {
      Alert.alert("Question required", "Add a poll question before posting.");
      return;
    }

    if (trimmedOptions.length < 2) {
      Alert.alert("Options required", "Polls need at least two options.");
      return;
    }

    try {
      await createPoll("group", groupId, trimmedQuestion, trimmedOptions);
      await Promise.all([
        loadGroupMessages(groupId, session.user.id),
        refreshGroupChats(session.user.id),
      ]);
      resetPollComposer();
    } catch (pollError) {
      Alert.alert(
        "Could not create poll",
        pollError instanceof Error ? pollError.message : "Please try again.",
      );
    }
  }

  async function handleVotePoll(pollId: string, optionId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before voting.");
      return;
    }

    try {
      await votePoll("group", groupId, messageIds, session.user.id, pollId, optionId);
    } catch (voteError) {
      Alert.alert(
        "Could not vote",
        voteError instanceof Error ? voteError.message : "Please try again.",
      );
    }
  }

  async function handleUnvotePoll(pollId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before updating votes.");
      return;
    }

    try {
      await unvotePoll("group", groupId, messageIds, session.user.id, pollId);
    } catch (voteError) {
      Alert.alert(
        "Could not remove vote",
        voteError instanceof Error ? voteError.message : "Please try again.",
      );
    }
  }

  async function handleSetPinned(messageId: string, pinned: boolean) {
    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before updating pinned messages.",
      );
      return;
    }

    try {
      await setPinned("group", groupId, messageIds, session.user.id, messageId, pinned);
    } catch (pinError) {
      Alert.alert(
        "Could not update pin",
        pinError instanceof Error ? pinError.message : "Please try again.",
      );
    }
  }

  const pinnedPreviews = useMemo(
    () =>
      pinnedMessages
        .map((pinnedMessage): PinnedMessagePreview | null => {
          const message = messages.find((item) => item.id === pinnedMessage.message_id);

          if (!message) {
            return null;
          }

          return {
            ...pinnedMessage,
            body:
              pollsByMessageId[message.id]?.question ??
              message.body ??
              "Pinned group message",
            senderName: message.sender_profile.display_name,
          };
        })
        .filter((message): message is PinnedMessagePreview => message !== null),
    [messages, pinnedMessages, pollsByMessageId],
  );

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
          <Pressable
            onPress={() => setIsPinnedDrawerOpen((current) => !current)}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F4F8]"
          >
            <SymbolView
              name={{ ios: "pin.fill", android: "push_pin", web: "push_pin" }}
              size={18}
              tintColor="#0F1115"
            />
          </Pressable>
        </View>
      </View>

      {isPinnedDrawerOpen ? (
        <PinnedMessagesDrawer
          pinnedMessages={pinnedPreviews}
          onUnpin={(messageId) => {
            void handleSetPinned(messageId, false);
          }}
        />
      ) : null}

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
            const poll = pollsByMessageId[message.id];
            const isPinned = pinnedMessages.some(
              (pinnedMessage) => pinnedMessage.message_id === message.id,
            );

            return (
              <View
                key={message.id}
                className={`${
                  poll ? "w-[88%] min-w-[260px]" : "max-w-[86%]"
                } ${isMine ? "self-end" : "self-start"}`}
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
                  {poll ? (
                    <ChatPollCard
                      poll={poll}
                      disabled={isVoting}
                      isDark={isMine}
                      onVote={(optionId) => {
                        void handleVotePoll(poll.id, optionId);
                      }}
                      onUnvote={() => {
                        void handleUnvotePoll(poll.id);
                      }}
                    />
                  ) : (
                    <Text
                      className={`text-[15px] leading-6 ${
                        isMine ? "text-white" : "text-[#0F1115]"
                      }`}
                    >
                      {message.body}
                    </Text>
                  )}
                  <View className={poll ? "mt-3 gap-2" : "mt-2 gap-2"}>
                    <Text
                      className={`text-[11px] ${
                        isMine ? "text-white/60" : "text-[#9AA0AB]"
                      }`}
                    >
                      {formatMessageTime(message.created_at)}
                    </Text>
                    <Pressable
                      disabled={isPinning}
                      onPress={() => {
                        void handleSetPinned(message.id, !isPinned);
                      }}
                      className={`self-start rounded-full px-3 py-1.5 ${
                        isMine ? "bg-[#20242B]" : "bg-[#F1F3F7]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          isMine ? "text-[#C9D0DB]" : "text-[#5C6370]"
                        }`}
                      >
                        {isPinned ? "Unpin" : "Pin"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="border-t border-[#DDE5EF] bg-[#EEF3F9] px-5 pb-6 pt-4">
        <View className="rounded-[22px] bg-white p-3">
          {isPollComposerOpen ? (
            <PollComposer
              question={pollQuestion}
              options={pollOptions}
              isCreating={isCreatingPoll}
              onQuestionChange={setPollQuestion}
              onOptionChange={(index, value) => {
                setPollOptions((current) =>
                  current.map((option, optionIndex) =>
                    optionIndex === index ? value : option,
                  ),
                );
              }}
              onAddOption={() => {
                setPollOptions((current) =>
                  current.length >= 6 ? current : [...current, ""],
                );
              }}
              onRemoveOption={(index) => {
                setPollOptions((current) =>
                  current.filter((_, optionIndex) => optionIndex !== index),
                );
              }}
              onCancel={resetPollComposer}
              onSubmit={() => {
                void handleCreatePoll();
              }}
            />
          ) : null}

          <View className="flex-row items-end gap-2">
            <Pressable
              disabled={isSending || !group}
              onPress={() => {
                setIsPollComposerOpen((current) => !current);
              }}
              className="h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F7]"
            >
              <SymbolView
                name={{ ios: "chart.bar.doc.horizontal", android: "poll", web: "poll" }}
                size={20}
                tintColor="#0F1115"
              />
            </Pressable>

            <View className="flex-1 rounded-[22px] border border-[#E4E9F1] bg-[#F9FBFD] px-3 py-1">
              <TextInput
                value={messageDraft}
                onChangeText={setMessageDraft}
                placeholder="Write to the group"
                placeholderTextColor="#9AA0AB"
                multiline
                className="min-h-[44px] text-[14px] leading-6 text-[#0F1115]"
              />
            </View>

            <View className="w-[88px]">
              <AppButton
                label={isSending ? "Sending..." : "Send"}
                disabled={isSending || !group}
                onPress={() => {
                  void handleSendMessage();
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
