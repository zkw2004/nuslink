import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton } from "@components/shared";
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

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;
const GROUP_AVATAR_GRADIENT = ["#F8C949", "#EAA31F"] as const;

function formatMessageTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatThreadTime(value: string) {
  return new Date(value).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const archivedGroupChats = useGroupMessagesStore((state) => state.archivedGroupChats);
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
    () => [...groupChats, ...archivedGroupChats].find((item) => item.id === groupId) ?? null,
    [archivedGroupChats, groupChats, groupId],
  );
  const messages = useMemo(
    () => messagesByGroup[groupId] ?? [],
    [groupId, messagesByGroup],
  );
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
  const chatKey = `group:${groupId}`;
  const pinnedMessages = useMemo(
    () => pinnedMessagesByChatKey[chatKey] ?? [],
    [chatKey, pinnedMessagesByChatKey],
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
    <View style={styles.threadRoot}>
      <LinearGradient
        colors={APP_GRADIENT}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topbar}>
          <GlassButton variant="light" onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backContent}>
              <Ionicons name="chevron-back" size={16} color="#33333F" />
              <Text style={styles.backText}>Back</Text>
            </View>
          </GlassButton>
          <View style={styles.topbarCenter}>
            <Text style={styles.topbarName} numberOfLines={1}>
              {group?.name ?? "Group chat"}
            </Text>
            <Text style={styles.topbarSub} numberOfLines={1}>
              {group
                ? [group.module_code, formatGroupTypeLabel(group.type)]
                    .filter(Boolean)
                    .join(" · ")
                : "loading group chat"}
            </Text>
          </View>
          <Pressable
            onPress={() => setIsPinnedDrawerOpen((current) => !current)}
            style={styles.avatarPressable}
          >
            <LinearGradient colors={GROUP_AVATAR_GRADIENT} style={styles.threadAvatar}>
              <Text style={styles.threadAvatarText}>
                {getInitials(group?.name ?? "Group") || "G"}
              </Text>
            </LinearGradient>
          </Pressable>
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
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Group chat is not available yet</Text>
            <Text style={styles.stateError}>{error}</Text>
          </View>
        ) : null}

        {!error && messages.length === 0 && !isThreadLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No messages yet</Text>
            <Text style={styles.stateText}>
              Start the group conversation here. Everyone in the group can read
              messages in this thread.
            </Text>
          </View>
        ) : null}

        <View style={styles.messageStack}>
          {messages.map((message) => {
            const isMine = message.sender_id === session?.user.id;
            const poll = pollsByMessageId[message.id];
            const isPinned = pinnedMessages.some(
              (pinnedMessage) => pinnedMessage.message_id === message.id,
            );

            return (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubbleTheirs,
                  poll ? styles.pollBubble : null,
                ]}
              >
                {!isMine ? (
                  <Text style={styles.senderLabel}>
                    {message.sender_profile.display_name}
                  </Text>
                ) : null}
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
                      style={[
                        styles.bubbleText,
                        isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                      ]}
                    >
                      {message.body}
                    </Text>
                  )}
                  <View style={styles.bubbleMeta}>
                    <Text
                      style={[
                        styles.bubbleTime,
                        isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                      ]}
                    >
                      {formatThreadTime(message.created_at)}
                    </Text>
                    {isMine ? (
                      <Ionicons
                        name="checkmark-done"
                        size={14}
                        color="rgba(255,255,255,0.82)"
                      />
                    ) : null}
                    <Pressable
                      disabled={isPinning}
                      onPress={() => {
                        void handleSetPinned(message.id, !isPinned);
                      }}
                      style={styles.pinPill}
                    >
                      <Text style={styles.pinPillText}>
                        {isPinned ? "Unpin" : "Pin"}
                      </Text>
                    </Pressable>
                  </View>
              </View>
            );
          })}
        </View>
        </ScrollView>

        <View style={styles.composerWrap}>
          <BlurView
            intensity={30}
            tint="systemChromeMaterialLight"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.composerTint} />
          {isPollComposerOpen ? (
            <View style={styles.composerPanel}>
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
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              disabled={isSending || !group}
              onPress={() => {
                setIsPollComposerOpen((current) => !current);
              }}
              style={styles.composerIcon}
            >
              <Ionicons name="stats-chart-outline" size={20} color="#7A7A8C" />
            </Pressable>

            <TextInput
              value={messageDraft}
              onChangeText={setMessageDraft}
              placeholder="Message"
              placeholderTextColor="#7A7A87"
              multiline
              style={styles.composerInput}
            />

            <GlassButton
              variant="dark"
              disabled={isSending || !group}
              onPress={() => {
                void handleSendMessage();
              }}
              style={styles.sendButton}
            >
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </GlassButton>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  threadRoot: { backgroundColor: "#E7EBF7", flex: 1 },
  safeArea: { flex: 1 },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: { paddingLeft: 10, paddingRight: 14, paddingVertical: 8 },
  backContent: { alignItems: "center", flexDirection: "row", gap: 4 },
  backText: { color: "#33333F", fontSize: 14, fontWeight: "500" },
  topbarCenter: { alignItems: "center", flex: 1 },
  topbarName: {
    color: "#10121F",
    fontSize: 16,
    fontWeight: "700",
    maxWidth: "100%",
  },
  topbarSub: {
    color: "#7A7A8C",
    fontSize: 12,
  },
  avatarPressable: { borderRadius: 20 },
  threadAvatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  threadAvatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  messagesContent: {
    gap: 8,
    paddingBottom: 90,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  messageStack: { gap: 8 },
  stateCard: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  stateTitle: { color: "#10121F", fontSize: 17, fontWeight: "800" },
  stateText: {
    color: "#606473",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  stateError: {
    color: "#C33B32",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  bubble: {
    borderWidth: 1,
    maxWidth: "76%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: "#3240A0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  pollBubble: { minWidth: 260, width: "88%" },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(91,79,224,0.92)",
    borderBottomRightRadius: 6,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderBottomLeftRadius: 6,
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
  },
  senderLabel: {
    color: "#6B6F7F",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextMine: { color: "#FFFFFF", fontWeight: "600" },
  bubbleTextTheirs: { color: "#1B1D29" },
  bubbleMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-end",
    marginTop: 2,
  },
  bubbleTime: { fontSize: 10.5, fontWeight: "500" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.74)" },
  bubbleTimeTheirs: { color: "#6B6F7F" },
  pinPill: { display: "none" },
  pinPillText: { color: "#6B6F7F", fontSize: 11, fontWeight: "700" },
  composerWrap: {
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 26,
    borderWidth: 1,
    bottom: 14,
    left: 12,
    overflow: "hidden",
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 7,
    position: "absolute",
    right: 12,
  },
  composerTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: 26,
  },
  composerPanel: { marginBottom: 12 },
  composerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  composerIcon: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 28,
  },
  composerInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 40,
  },
  sendButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
