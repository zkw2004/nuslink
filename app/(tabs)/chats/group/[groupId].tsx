import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton, GlassSurface } from "@components/shared";
import { ModeratedMessageText, ModerationAlert } from "@components/moderation";
import { ChatMeetupCard } from "@features/chat/ChatMeetupCard";
import {
  ChatPollCard,
  PinnedMessagesDrawer,
  PollComposer,
  type PinnedMessagePreview,
} from "@features/chat/ChatFeaturePanels";
import { AttachSheet } from "@features/chat/AttachSheet";
import { CreateMeetupSheet, type MeetupDraft } from "@features/chat/CreateMeetupSheet";
import { getMeetupCloseIso } from "@features/chat/meetupDraft";
import {
  MessageActionMenu,
  type MessageActionKey,
} from "@features/chat/MessageActionMenu";
import type { MeetupSuggestion } from "@appTypes/index";
import {
  deleteGroupMessageForEveryone,
  deleteGroupMessageForMe,
  editGroupMessage,
} from "@services/groupMessagesService";
import { fetchMeetupSuggestions } from "@services/meetupSuggestionsService";
import {
  classifyFastChatModeration,
  moderateMessageInBackground,
} from "@services/moderationService";
import {
  useAuthStore,
  useChatFeaturesStore,
  useGroupMessagesStore,
} from "@store/index";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;
const GROUP_AVATAR_GRADIENT = ["#F8C949", "#EAA31F"] as const;

function getHeaderMetrics(width: number) {
  return {
    avatarSize: width * 0.09,
    backHeight: width * 0.086,
    backIconSize: width * 0.032,
    backWidth: width * 0.19,
    headerHeight: width * 0.174,
    paddingLeft: width * 0.03,
    paddingRight: width * 0.075,
    titleHeight: width * 0.095,
    titleWidth: width * 0.46,
  };
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
  const { width: screenWidth } = useWindowDimensions();
  const headerMetrics = useMemo(() => getHeaderMetrics(screenWidth), [screenWidth]);
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
  const meetupsByMessageId = useChatFeaturesStore((state) => state.meetupsByMessageId);
  const pinnedMessagesByChatKey = useChatFeaturesStore(
    (state) => state.pinnedMessagesByChatKey,
  );
  const isCreatingPoll = useChatFeaturesStore((state) => state.isCreatingPoll);
  const isVoting = useChatFeaturesStore((state) => state.isVoting);
  const isCreatingMeetup = useChatFeaturesStore((state) => state.isCreatingMeetup);
  const isVotingMeetup = useChatFeaturesStore((state) => state.isVotingMeetup);
  const isPinning = useChatFeaturesStore((state) => state.isPinning);
  const loadFeatures = useChatFeaturesStore((state) => state.loadFeatures);
  const createPoll = useChatFeaturesStore((state) => state.createPoll);
  const createMeetup = useChatFeaturesStore((state) => state.createMeetup);
  const votePoll = useChatFeaturesStore((state) => state.votePoll);
  const unvotePoll = useChatFeaturesStore((state) => state.unvotePoll);
  const voteMeetup = useChatFeaturesStore((state) => state.voteMeetup);
  const unvoteMeetup = useChatFeaturesStore((state) => state.unvoteMeetup);
  const setPinned = useChatFeaturesStore((state) => state.setPinned);
  const subscribeToFeatureChanges = useChatFeaturesStore(
    (state) => state.subscribeToFeatureChanges,
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [isModerationAlertVisible, setIsModerationAlertVisible] = useState(false);
  const [isAttachSheetOpen, setIsAttachSheetOpen] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [isMeetupComposerOpen, setIsMeetupComposerOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [meetupSuggestions, setMeetupSuggestions] = useState<MeetupSuggestion[]>([]);
  const [isLoadingMeetupSuggestions, setIsLoadingMeetupSuggestions] = useState(false);
  const [meetupHelperText, setMeetupHelperText] = useState<string | null>(null);
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

    if (editingMessageId) {
      try {
        await editGroupMessage(editingMessageId, trimmedDraft);
        await loadGroupMessages(groupId, session.user.id);
        setEditingMessageId(null);
        setMessageDraft("");
      } catch (editError) {
        Alert.alert(
          "Could not edit message",
          editError instanceof Error ? editError.message : "Please try again.",
        );
      }
      return;
    }

    try {
      const fastModeration = classifyFastChatModeration(trimmedDraft);
      if (fastModeration.outcome === "blocked") {
        setIsModerationAlertVisible(true);
        return;
      }

      setMessageDraft("");
      const messageId = await sendMessage(
        groupId,
        trimmedDraft,
        session.user.id,
        "pending",
      );
      moderateMessageInBackground(
        { kind: "group", messageId, content: trimmedDraft },
        () => {
          void loadGroupMessages(groupId, session.user.id);
        },
      );
    } catch (sendError) {
      setMessageDraft(trimmedDraft);
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    }
  }

  async function openMeetupComposer() {
    setIsLoadingMeetupSuggestions(true);
    setMeetupHelperText(null);
    setIsMeetupComposerOpen(true);

    try {
      const response = await fetchMeetupSuggestions("group", groupId);
      setMeetupSuggestions(response.suggestions);

      if (response.suggestions.length === 0) {
        setMeetupHelperText(
          "At least two group members need uploaded current-semester timetable availability before overlap suggestions can appear.",
        );
      }
    } catch (suggestionError) {
      setMeetupSuggestions([]);
      setMeetupHelperText(
        suggestionError instanceof Error
          ? suggestionError.message
          : "Could not load meetup suggestions right now.",
      );
    } finally {
      setIsLoadingMeetupSuggestions(false);
    }
  }

  function handlePickAttachment(type: "photo" | "video" | "file" | "audio" | "poll" | "meetup") {
    if (type === "poll") {
      setIsPollComposerOpen(true);
      return;
    }

    if (type === "meetup") {
      void openMeetupComposer();
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

  async function handleCreateMeetup(draft: MeetupDraft) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before creating meetups.");
      return;
    }

    if (!draft.title.trim()) {
      Alert.alert("Title required", "Add a meetup title before posting.");
      return;
    }

    if (draft.options.length < 2) {
      Alert.alert(
        "Options required",
        "Meetups need at least two suggested or custom time options.",
      );
      return;
    }

    try {
      await createMeetup(
        "group",
        groupId,
        draft.title.trim(),
        draft.options,
        getMeetupCloseIso(draft.countdown),
      );
      await Promise.all([
        loadGroupMessages(groupId, session.user.id),
        refreshGroupChats(session.user.id),
      ]);
    } catch (meetupError) {
      Alert.alert(
        "Could not create meetup",
        meetupError instanceof Error ? meetupError.message : "Please try again.",
      );
    }
  }

  async function handleVoteMeetup(meetupId: string, optionId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before voting.");
      return;
    }

    try {
      await voteMeetup("group", groupId, messageIds, session.user.id, meetupId, optionId);
    } catch (meetupError) {
      Alert.alert(
        "Could not vote",
        meetupError instanceof Error ? meetupError.message : "Please try again.",
      );
    }
  }

  async function handleUnvoteMeetup(meetupId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before updating meetup votes.");
      return;
    }

    try {
      await unvoteMeetup("group", groupId, messageIds, session.user.id, meetupId);
    } catch (meetupError) {
      Alert.alert(
        "Could not remove vote",
        meetupError instanceof Error ? meetupError.message : "Please try again.",
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
              meetupsByMessageId[message.id]?.title ??
              pollsByMessageId[message.id]?.question ??
              message.body ??
              "Pinned group message",
            senderName: message.sender_profile.display_name,
          };
        })
        .filter((message): message is PinnedMessagePreview => message !== null),
    [messages, meetupsByMessageId, pinnedMessages, pollsByMessageId],
  );
  const selectedMessage = selectedMessageId
    ? messages.find((message) => message.id === selectedMessageId) ?? null
    : null;

  async function handleMessageAction(action: MessageActionKey) {
    if (!selectedMessage || !session?.user.id) {
      setSelectedMessageId(null);
      return;
    }

    if (action === "pin") {
      setSelectedMessageId(null);
      Alert.alert("Pin this message?", "Pinned messages are visible to everyone in this chat.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pin for everyone",
          onPress: () => {
            void handleSetPinned(selectedMessage.id, true);
          },
        },
      ]);
      return;
    }

    if (action === "edit") {
      setEditingMessageId(selectedMessage.id);
      setMessageDraft(selectedMessage.body ?? "");
      setSelectedMessageId(null);
      return;
    }

    if (action === "delete") {
      const isMine = selectedMessage.sender_id === session.user.id;
      setSelectedMessageId(null);
      Alert.alert(
        "Delete message?",
        isMine ? "Choose how this message should be deleted." : "This only removes the message for you.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete for me",
            style: "destructive",
            onPress: () => {
              void deleteGroupMessageForMe(selectedMessage.id, session.user.id).then(() =>
                loadGroupMessages(groupId, session.user.id),
              );
            },
          },
          ...(isMine
            ? [
                {
                  text: "Delete for everyone",
                  style: "destructive" as const,
                  onPress: () => {
                    void deleteGroupMessageForEveryone(selectedMessage.id).then(() =>
                      loadGroupMessages(groupId, session.user.id),
                    );
                  },
                },
              ]
            : []),
        ],
      );
      return;
    }

    setSelectedMessageId(null);
    Alert.alert("Coming soon", `${action} will be wired in the next chat slice.`);
  }

  return (
    <View style={styles.threadRoot}>
      <LinearGradient
        colors={APP_GRADIENT}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.topbar,
            {
              height: headerMetrics.headerHeight,
              paddingLeft: headerMetrics.paddingLeft,
              paddingRight: headerMetrics.paddingRight,
            },
          ]}
        >
          <View style={styles.headerSideLeft}>
          <Pressable onPress={() => router.back()}>
            <GlassSurface
              tint="light"
              radius={headerMetrics.backHeight / 2}
              intensity={40}
              style={[
                styles.backButton,
                { height: headerMetrics.backHeight, width: headerMetrics.backWidth },
              ]}
            >
              <View style={[styles.backButtonContent, { height: headerMetrics.backHeight }]}>
                <Ionicons
                  name="chevron-back"
                  size={headerMetrics.backIconSize}
                  color="#33333F"
                />
                <Text style={styles.backText}>Back</Text>
              </View>
            </GlassSurface>
          </Pressable>
          </View>
          <View style={styles.centerArea}>
          <Pressable
            style={[
              styles.namePill,
              {
                borderRadius: headerMetrics.titleHeight / 2,
                height: headerMetrics.titleHeight,
                width: headerMetrics.titleWidth,
              },
            ]}
            onPress={() => {
              router.push({
                pathname: "/(tabs)/chats/info",
                params: { kind: "group", id: groupId },
              } as never);
            }}
          >
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.topbarName}>
              {group?.name ?? "Group chat"}
            </Text>
            <Text style={styles.topbarSub} numberOfLines={1}>
              {group ? formatGroupTypeLabel(group.type) : "Study Group"}
            </Text>
          </Pressable>
          </View>
          <View style={styles.headerSideRight}>
          <Pressable
            onPress={() => setIsPinnedDrawerOpen((current) => !current)}
            style={styles.avatarPressable}
          >
            <LinearGradient
              colors={GROUP_AVATAR_GRADIENT}
              style={[
                styles.threadAvatar,
                {
                  borderRadius: headerMetrics.avatarSize / 2,
                  height: headerMetrics.avatarSize,
                  width: headerMetrics.avatarSize,
                },
              ]}
            >
              <Text style={styles.threadAvatarText}>
                {getInitials(group?.name ?? "Group") || "G"}
              </Text>
            </LinearGradient>
          </Pressable>
          </View>
        </View>

        {pinnedPreviews[0] ? (
          <View style={styles.pinnedBanner}>
            <View style={styles.pinnedAccent} />
            <View style={styles.pinnedContent}>
              <Text style={styles.pinnedLabel}>Pinned message</Text>
              <Text numberOfLines={1} style={styles.pinnedText}>
                {pinnedPreviews[0].body}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void handleSetPinned(pinnedPreviews[0].message_id, false);
              }}
              style={styles.pinnedClose}
            >
              <Ionicons name="close" size={15} color="#6E6E80" />
            </Pressable>
          </View>
        ) : null}

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
            const meetup = meetupsByMessageId[message.id];
            const isPinned = pinnedMessages.some(
              (pinnedMessage) => pinnedMessage.message_id === message.id,
            );

            return (
              <Pressable
                key={message.id}
                onLongPress={() => setSelectedMessageId(message.id)}
                delayLongPress={320}
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubbleTheirs,
                  poll || meetup ? styles.pollBubble : null,
                ]}
              >
                {!isMine ? (
                  <Text style={styles.senderLabel}>
                    {message.sender_profile.display_name}
                  </Text>
                ) : null}
                  {meetup ? (
                    <ChatMeetupCard
                      meetup={meetup}
                      disabled={isVotingMeetup}
                      isDark={isMine}
                      onVote={(optionId) => {
                        void handleVoteMeetup(meetup.id, optionId);
                      }}
                      onUnvote={() => {
                        void handleUnvoteMeetup(meetup.id);
                      }}
                    />
                  ) : poll ? (
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
                  ) : message.body ? (
                    <ModeratedMessageText
                      text={message.body}
                      verdict={message.moderation_outcome}
                      mine={isMine}
                      textStyle={[
                        styles.bubbleText,
                        isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                      ]}
                    />
                  ) : null}
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
              </Pressable>
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
                    current.length >= 12 ? current : [...current, ""],
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
          {isMeetupComposerOpen ? (
            <CreateMeetupSheet
              visible={isMeetupComposerOpen}
              suggestions={meetupSuggestions}
              isLoadingSuggestions={isLoadingMeetupSuggestions}
              helperText={meetupHelperText}
              isCreating={isCreatingMeetup}
              onClose={() => setIsMeetupComposerOpen(false)}
              onSend={(draft) => {
                void handleCreateMeetup(draft);
              }}
            />
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              disabled={isSending || !group}
              onPress={() => setIsAttachSheetOpen(true)}
              style={styles.composerIcon}
            >
              <Ionicons name="attach" size={22} color="#7A7A8C" />
            </Pressable>

            <TextInput
              value={messageDraft}
              onChangeText={setMessageDraft}
              placeholder={editingMessageId ? "Edit message" : "Message"}
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
        <AttachSheet
          visible={isAttachSheetOpen}
          isGroup
          allowedTypes={["poll", "meetup"]}
          onClose={() => setIsAttachSheetOpen(false)}
          onPick={handlePickAttachment}
        />
        <MessageActionMenu
          visible={selectedMessage !== null}
          isMine={selectedMessage?.sender_id === session?.user.id}
          onClose={() => setSelectedMessageId(null)}
          onAction={(action) => {
            void handleMessageAction(action);
          }}
          onReact={() => {
            setSelectedMessageId(null);
          }}
        />
      </SafeAreaView>
      <ModerationAlert
        visible={isModerationAlertVisible}
        onClose={() => setIsModerationAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  threadRoot: { backgroundColor: "#E7EBF7", flex: 1 },
  safeArea: { flex: 1 },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
  },
  headerSideLeft: {
    alignItems: "flex-start",
    flex: 1,
  },
  headerSideRight: {
    alignItems: "flex-end",
    flex: 1,
  },
  backButton: {
    shadowColor: "#8795C5",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  backButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  backText: { color: "#33333F", fontSize: 14, fontWeight: "500" },
  centerArea: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    transform: [{ translateX: 15 }],
  },
  namePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.82)",
    borderWidth: 1.5,
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 20,
    shadowColor: "#8290BE",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    width: "100%",
  },
  topbarName: {
    color: "#10121F",
    fontSize: 15.5,
    fontWeight: "700",
    lineHeight: 19,
    maxWidth: "100%",
    minWidth: 0,
  },
  topbarSub: {
    color: "#696C7C",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 15,
  },
  avatarPressable: { borderRadius: 20 },
  threadAvatar: {
    alignItems: "center",
    borderColor: "rgba(210,225,244,0.9)",
    borderWidth: 2,
    justifyContent: "center",
  },
  threadAvatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  messagesContent: {
    gap: 8,
    paddingBottom: 90,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pinnedBanner: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pinnedAccent: {
    backgroundColor: "#5B4FE0",
    borderRadius: 2,
    height: 32,
    width: 3,
  },
  pinnedContent: { flex: 1, minWidth: 0 },
  pinnedLabel: { color: "#4230A0", fontSize: 11, fontWeight: "700" },
  pinnedText: { color: "#4B4B57", fontSize: 12.5, marginTop: 1 },
  pinnedClose: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
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
    flexShrink: 0,
    maxWidth: "76%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: "#3240A0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  pollBubble: { maxWidth: 300, minWidth: 260, width: "88%" },
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
    borderRadius: 22,
    borderWidth: 1,
    bottom: 18,
    left: 20,
    overflow: "hidden",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    position: "absolute",
    right: 20,
  },
  composerTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: 22,
  },
  composerPanel: { marginBottom: 12 },
  composerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  composerIcon: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 24,
  },
  composerInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 14,
    maxHeight: 90,
    minHeight: 34,
    paddingBottom: 4,
    paddingTop: 7,
    textAlignVertical: "center",
  },
  sendButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
});
