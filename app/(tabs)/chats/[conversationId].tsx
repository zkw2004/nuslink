import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";

import { AppAvatar, AppButton, BadgeTierPill, SectionCard } from "@components/shared";
import type { ChatAttachmentKind } from "@appTypes/index";
import {
  ChatPollCard,
  PinnedMessagesDrawer,
  PollComposer,
  type PinnedMessagePreview,
} from "@features/chat/ChatFeaturePanels";
import { uploadChatAttachment } from "@services/directMessagesService";
import { useAuthStore, useChatFeaturesStore, useDirectMessagesStore } from "@store/index";

type PendingAttachment = {
  bytes: ArrayBuffer;
  previewUri: string | null;
  name: string;
  mimeType: string;
  size: number | null;
  kind: ChatAttachmentKind;
};

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    copyToCacheDirectory: boolean;
    multiple: boolean;
    type: string[];
  }) => Promise<
    | { canceled: true }
    | {
        canceled: false;
        assets: {
          uri: string;
          name: string;
          mimeType?: string;
          size?: number;
        }[];
      }
  >;
};

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

function formatFileSize(size: number | null) {
  if (!size) {
    return "Attachment";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeTypeFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/x-m4a";
    case "wav":
      return "audio/wav";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function getDefaultAttachmentName(kind: ChatAttachmentKind, mimeType: string) {
  if (kind === "file") {
    return "attachment";
  }

  if (kind === "audio") {
    return mimeType === "audio/mpeg" ? "voice-note.mp3" : "voice-note.m4a";
  }

  if (kind === "video") {
    return mimeType === "video/quicktime" ? "clip.mov" : "clip.mp4";
  }

  if (mimeType === "image/png") {
    return "photo.png";
  }

  if (mimeType === "image/webp") {
    return "photo.webp";
  }

  return "photo.jpg";
}

function getAttachmentIconName(kind: ChatAttachmentKind) {
  switch (kind) {
    case "video":
      return { ios: "play.rectangle.fill", android: "movie", web: "movie" } as const;
    case "audio":
      return { ios: "waveform", android: "graphic_eq", web: "graphic_eq" } as const;
    case "image":
      return { ios: "photo.fill", android: "image", web: "image" } as const;
    default:
      return { ios: "doc.fill", android: "description", web: "description" } as const;
  }
}

function getAttachmentMeta(kind: ChatAttachmentKind, size: number | null) {
  switch (kind) {
    case "video":
      return `Video · ${formatFileSize(size)}`;
    case "audio":
      return `Audio · ${formatFileSize(size)}`;
    case "image":
      return `Image · ${formatFileSize(size)}`;
    default:
      return formatFileSize(size);
  }
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
  const subscribeToConversation = useDirectMessagesStore(
    (state) => state.subscribeToConversation,
  );
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
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const conversation = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversationId, conversations],
  );
  const messages = useMemo(
    () => messagesByConversation[conversationId] ?? [],
    [conversationId, messagesByConversation],
  );
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
  const chatKey = `direct:${conversationId}`;
  const pinnedMessages = pinnedMessagesByChatKey[chatKey] ?? [];
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return;
    }

    void refreshInbox(session.user.id).then(() => {
      void loadConversationMessages(conversationId, session.user.id);
    });
  }, [conversationId, loadConversationMessages, refreshInbox, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return undefined;
    }

    return subscribeToConversation(conversationId, session.user.id);
  }, [conversationId, session?.user.id, subscribeToConversation]);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return;
    }

    void loadFeatures("direct", conversationId, messageIds, session.user.id);
  }, [conversationId, loadFeatures, messageIds, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return undefined;
    }

    return subscribeToFeatureChanges(
      "direct",
      conversationId,
      messageIds,
      session.user.id,
    );
  }, [
    conversationId,
    messageIds,
    session?.user.id,
    subscribeToFeatureChanges,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [messages.length]);

  async function handlePickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Photo library permission is needed to attach media.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ["images", "videos"],
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    const kind: ChatAttachmentKind =
      mimeType.startsWith("video/") ? "video" : "image";
    const bytes = await new ExpoFile(asset.uri).arrayBuffer();

    setPendingAttachment({
      bytes,
      previewUri: asset.uri,
      name: asset.fileName ?? getDefaultAttachmentName(kind, mimeType),
      mimeType,
      size: asset.fileSize ?? null,
      kind,
    });
  }

  async function handlePickFile() {
    let documentPicker: DocumentPickerModule;

    try {
      // eslint-disable-next-line import/no-unresolved
      documentPicker = (await import("expo-document-picker")) as DocumentPickerModule;
    } catch {
      Alert.alert(
        "File picker unavailable",
        "Install project dependencies again on this machine before sending file attachments.",
      );
      return;
    }

    const result = await documentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const bytes = await new ExpoFile(asset.uri).arrayBuffer();

    setPendingAttachment({
      bytes,
      previewUri: null,
      name: asset.name || getDefaultAttachmentName("file", asset.mimeType ?? ""),
      mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
      size: asset.size ?? bytes.byteLength,
      kind: "file",
    });
  }

  async function handlePickAudio() {
    let documentPicker: DocumentPickerModule;

    try {
      // eslint-disable-next-line import/no-unresolved
      documentPicker = (await import("expo-document-picker")) as DocumentPickerModule;
    } catch {
      Alert.alert(
        "File picker unavailable",
        "Install project dependencies again on this machine before sending audio.",
      );
      return;
    }

    const result = await documentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "audio/mpeg",
        "audio/mp4",
        "audio/x-m4a",
        "audio/wav",
        "audio/x-wav",
      ],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const bytes = await new ExpoFile(asset.uri).arrayBuffer();

    setPendingAttachment({
      bytes,
      previewUri: null,
      name: asset.name || getDefaultAttachmentName("audio", asset.mimeType ?? ""),
      mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
      size: asset.size ?? bytes.byteLength,
      kind: "audio",
    });
  }

  function openAttachmentMenu() {
    Alert.alert("Attach", "Choose what to share", [
      {
        text: "Photo or video",
        onPress: () => {
          void handlePickMedia();
        },
      },
      {
        text: "File",
        onPress: () => {
          void handlePickFile();
        },
      },
      {
        text: "Audio",
        onPress: () => {
          void handlePickAudio();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSendMessage() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before sending messages.");
      return;
    }

    const trimmedMessage = messageDraft.trim();

    if (!trimmedMessage && !pendingAttachment) {
      Alert.alert("Write a message", "Type something or attach media before sending.");
      return;
    }

    setIsUploadingAttachment(true);

    try {
      const uploadedAttachment = pendingAttachment
        ? await uploadChatAttachment({
            bytes: pendingAttachment.bytes,
            uri: pendingAttachment.previewUri ?? pendingAttachment.name,
            name: pendingAttachment.name,
            mimeType: pendingAttachment.mimeType,
            size: pendingAttachment.size,
            kind: pendingAttachment.kind,
          })
        : null;

      await sendMessage(
        conversationId,
        trimmedMessage,
        session.user.id,
        uploadedAttachment,
      );
      setMessageDraft("");
      setPendingAttachment(null);
    } catch (sendError) {
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    } finally {
      setIsUploadingAttachment(false);
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
      await createPoll("direct", conversationId, trimmedQuestion, trimmedOptions);
      await Promise.all([
        loadConversationMessages(conversationId, session.user.id),
        refreshInbox(session.user.id),
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
      await votePoll(
        "direct",
        conversationId,
        messageIds,
        session.user.id,
        pollId,
        optionId,
      );
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
      await unvotePoll(
        "direct",
        conversationId,
        messageIds,
        session.user.id,
        pollId,
      );
    } catch (voteError) {
      Alert.alert(
        "Could not remove vote",
        voteError instanceof Error ? voteError.message : "Please try again.",
      );
    }
  }

  async function handleSetPinned(messageId: string, pinned: boolean) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before pinning messages.");
      return;
    }

    try {
      await setPinned(
        "direct",
        conversationId,
        messageIds,
        session.user.id,
        messageId,
        pinned,
      );
    } catch (pinError) {
      Alert.alert(
        "Could not update pinned messages",
        pinError instanceof Error ? pinError.message : "Please try again.",
      );
    }
  }

  function getPinnedPreview(messageId: string) {
    const message = messages.find((item) => item.id === messageId);

    if (!message) {
      return null;
    }

    const poll = pollsByMessageId[message.id];
    const body =
      poll?.question ??
      message.body ??
      message.attachment_name ??
      (message.attachment_kind === "image" ? "Photo attachment" : "File attachment");

    return {
      body,
      senderName:
        message.sender_id === session?.user.id
          ? "You"
          : conversation?.other_user.display_name ?? "Connection",
    };
  }

  const pinnedPreviews = pinnedMessages
    .map((pinnedMessage): PinnedMessagePreview | null => {
      const preview = getPinnedPreview(pinnedMessage.message_id);

      if (!preview) {
        return null;
      }

      return {
        ...pinnedMessage,
        body: preview.body,
        senderName: preview.senderName,
      };
    })
    .filter((message): message is PinnedMessagePreview => message !== null);

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

          {conversation ? (
            <Pressable
              onPress={() => {
                router.push(`/chats/media/${conversationId}` as never);
              }}
              className="flex-1 flex-row items-center gap-3 rounded-[20px] bg-white px-4 py-3"
            >
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
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => setIsPinnedDrawerOpen((current) => !current)}
            className="h-12 w-12 items-center justify-center rounded-full bg-white"
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
            const hasImage = message.attachment_kind === "image" && message.attachment_url;
            const hasAttachmentCard =
              message.attachment_kind !== null &&
              message.attachment_kind !== "image" &&
              Boolean(message.attachment_url);
            const poll = pollsByMessageId[message.id];
            const isPinned = pinnedMessages.some(
              (pinnedMessage) => pinnedMessage.message_id === message.id,
            );

            return (
              <View
                key={message.id}
                className={`rounded-[18px] px-4 py-3 ${
                  poll ? "w-[88%] min-w-[260px]" : "max-w-[88%]"
                } ${
                  isCurrentUser ? "self-end bg-[#0F1115]" : "self-start bg-white"
                }`}
              >
                {hasImage ? (
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(message.attachment_url ?? "");
                    }}
                  >
                    <Image
                      source={{ uri: message.attachment_url ?? "" }}
                      className="mb-3 h-48 w-64 rounded-[14px] bg-[#DDE5EF]"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}

                {hasAttachmentCard ? (
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(message.attachment_url ?? "");
                    }}
                    className={`mb-3 rounded-[14px] border px-3 py-3 ${
                      isCurrentUser
                        ? "border-[#303744] bg-[#20242B]"
                        : "border-[#E4E9F1] bg-[#F7F9FC]"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <SymbolView
                        name={getAttachmentIconName(message.attachment_kind ?? "file")}
                        size={22}
                        tintColor={isCurrentUser ? "#FFFFFF" : "#0F1115"}
                      />
                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className={`text-[13px] font-semibold ${
                            isCurrentUser ? "text-white" : "text-[#0F1115]"
                          }`}
                        >
                          {message.attachment_name ?? "Attachment"}
                        </Text>
                        <Text
                          className={`mt-1 text-[11px] ${
                            isCurrentUser ? "text-[#C9D0DB]" : "text-[#7B8494]"
                          }`}
                        >
                          {getAttachmentMeta(message.attachment_kind ?? "file", message.attachment_size)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ) : null}

                {poll ? (
                  <ChatPollCard
                    poll={poll}
                    disabled={isVoting}
                    isDark={isCurrentUser}
                    onVote={(optionId) => {
                      void handleVotePoll(poll.id, optionId);
                    }}
                    onUnvote={() => {
                      void handleUnvotePoll(poll.id);
                    }}
                  />
                ) : message.body ? (
                  <Text
                    className={`text-[14px] leading-6 ${
                      isCurrentUser ? "text-white" : "text-[#0F1115]"
                    }`}
                  >
                    {message.body}
                  </Text>
                ) : null}
                <View className={poll ? "mt-3 gap-2" : "mt-2 gap-2"}>
                  <Text
                    className={`text-[11px] ${
                      isCurrentUser ? "text-[#C9D0DB]" : "text-[#7B8494]"
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
                      isCurrentUser ? "bg-[#20242B]" : "bg-[#F1F3F7]"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-semibold ${
                        isCurrentUser ? "text-[#C9D0DB]" : "text-[#5C6370]"
                      }`}
                    >
                      {isPinned ? "Unpin" : "Pin"}
                    </Text>
                  </Pressable>
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

          {pendingAttachment ? (
            <View className="mb-3 rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] p-3">
              <View className="flex-row items-center gap-3">
                {pendingAttachment.kind === "image" && pendingAttachment.previewUri ? (
                  <Image
                    source={{ uri: pendingAttachment.previewUri }}
                    className="h-14 w-14 rounded-[12px] bg-[#DDE5EF]"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-14 w-14 items-center justify-center rounded-[12px] bg-[#E4E9F1]">
                    <SymbolView
                      name={getAttachmentIconName(pendingAttachment.kind)}
                      size={22}
                      tintColor="#0F1115"
                    />
                  </View>
                )}
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[14px] font-semibold text-[#0F1115]"
                  >
                    {pendingAttachment.name}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#7B8494]">
                    {getAttachmentMeta(pendingAttachment.kind, pendingAttachment.size)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPendingAttachment(null)}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white"
                >
                  <SymbolView name="xmark" size={14} tintColor="#0F1115" />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View className="flex-row items-end gap-2">
            <Pressable
              disabled={isSending || isUploadingAttachment || !conversation}
              onPress={openAttachmentMenu}
              className="h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F7]"
            >
              <SymbolView
                name={{
                  ios: "paperclip",
                  android: "attach_file",
                  web: "attach_file",
                }}
                size={20}
                tintColor="#0F1115"
              />
            </Pressable>

            <Pressable
              disabled={isSending || isUploadingAttachment || !conversation}
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
                placeholder="Write a message"
                placeholderTextColor="#9AA0AB"
                multiline
                className="min-h-[44px] text-[14px] leading-6 text-[#0F1115]"
              />
            </View>

            <View className="w-[88px]">
              <AppButton
                label={isSending || isUploadingAttachment ? "Sending..." : "Send"}
                disabled={isSending || isUploadingAttachment || !conversation}
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
