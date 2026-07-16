import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
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
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton, GlassSurface } from "@components/shared";
import type { ChatAttachmentKind } from "@appTypes/index";
import {
  ChatPollCard,
  PinnedMessagesDrawer,
  PollComposer,
  type PinnedMessagePreview,
} from "@features/chat/ChatFeaturePanels";
import { AttachSheet } from "@features/chat/AttachSheet";
import {
  MessageActionMenu,
  type MessageActionKey,
} from "@features/chat/MessageActionMenu";
import {
  deleteDirectMessageForEveryone,
  deleteDirectMessageForMe,
  editDirectMessage,
  uploadChatAttachment,
} from "@services/directMessagesService";
import {
  useAuthStore,
  useChatFeaturesStore,
  useDirectMessagesStore,
} from "@store/index";

type PendingAttachment = {
  bytes: ArrayBuffer;
  previewUri: string | null;
  name: string;
  mimeType: string;
  size: number | null;
  kind: ChatAttachmentKind;
};

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;
const AVATAR_GRADIENT = ["#7DB2D3", "#427AA0"] as const;

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

function getAttachmentIconName(
  kind: ChatAttachmentKind,
): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "video":
      return "videocam-outline";
    case "audio":
      return "musical-notes-outline";
    case "image":
      return "image-outline";
    default:
      return "document-text-outline";
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
  const { width: screenWidth } = useWindowDimensions();
  const headerMetrics = useMemo(
    () => getHeaderMetrics(screenWidth),
    [screenWidth],
  );
  const session = useAuthStore((state) => state.session);
  const conversations = useDirectMessagesStore((state) => state.conversations);
  const archivedConversations = useDirectMessagesStore(
    (state) => state.archivedConversations,
  );
  const messagesByConversation = useDirectMessagesStore(
    (state) => state.messagesByConversation,
  );
  const isThreadLoading = useDirectMessagesStore(
    (state) => state.isThreadLoading,
  );
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
  const pollsByMessageId = useChatFeaturesStore(
    (state) => state.pollsByMessageId,
  );
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
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [isAttachSheetOpen, setIsAttachSheetOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const conversation = useMemo(
    () =>
      [...conversations, ...archivedConversations].find(
        (item) => item.id === conversationId,
      ) ?? null,
    [archivedConversations, conversationId, conversations],
  );
  const messages = useMemo(
    () => messagesByConversation[conversationId] ?? [],
    [conversationId, messagesByConversation],
  );
  const messageIds = useMemo(
    () => messages.map((message) => message.id),
    [messages],
  );
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
  }, [
    conversationId,
    loadConversationMessages,
    refreshInbox,
    session?.user.id,
  ]);

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
  }, [conversationId, messageIds, session?.user.id, subscribeToFeatureChanges]);

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
    const kind: ChatAttachmentKind = mimeType.startsWith("video/")
      ? "video"
      : "image";
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
      documentPicker =
        (await import("expo-document-picker")) as DocumentPickerModule;
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
      name:
        asset.name || getDefaultAttachmentName("file", asset.mimeType ?? ""),
      mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
      size: asset.size ?? bytes.byteLength,
      kind: "file",
    });
  }

  async function handlePickAudio() {
    let documentPicker: DocumentPickerModule;

    try {
      // eslint-disable-next-line import/no-unresolved
      documentPicker =
        (await import("expo-document-picker")) as DocumentPickerModule;
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
      name:
        asset.name || getDefaultAttachmentName("audio", asset.mimeType ?? ""),
      mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
      size: asset.size ?? bytes.byteLength,
      kind: "audio",
    });
  }

  function openAttachmentMenu() {
    setIsAttachSheetOpen(true);
  }

  function handlePickAttachment(
    type: "photo" | "video" | "file" | "audio" | "poll",
  ) {
    if (type === "file") {
      void handlePickFile();
      return;
    }

    if (type === "audio") {
      void handlePickAudio();
      return;
    }

    if (type === "poll") {
      setIsPollComposerOpen(true);
      return;
    }

    void handlePickMedia();
  }

  async function handleSendMessage() {
    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before sending messages.",
      );
      return;
    }

    const trimmedMessage = messageDraft.trim();

    if (!trimmedMessage && !pendingAttachment) {
      Alert.alert(
        "Write a message",
        "Type something or attach media before sending.",
      );
      return;
    }

    if (editingMessageId) {
      try {
        await editDirectMessage(editingMessageId, trimmedMessage);
        await loadConversationMessages(conversationId, session.user.id);
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
    const trimmedOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before creating polls.",
      );
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
      await createPoll(
        "direct",
        conversationId,
        trimmedQuestion,
        trimmedOptions,
      );
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
      Alert.alert(
        "Sign in required",
        "Please sign in again before updating votes.",
      );
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
      Alert.alert(
        "Sign in required",
        "Please sign in again before pinning messages.",
      );
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
      (message.attachment_kind === "image"
        ? "Photo attachment"
        : "File attachment");

    return {
      body,
      senderName:
        message.sender_id === session?.user.id
          ? "You"
          : (conversation?.other_user.display_name ?? "Connection"),
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
  const selectedMessage = selectedMessageId
    ? (messages.find((message) => message.id === selectedMessageId) ?? null)
    : null;

  async function handleMessageAction(action: MessageActionKey) {
    if (!selectedMessage || !session?.user.id) {
      setSelectedMessageId(null);
      return;
    }

    if (action === "pin") {
      setSelectedMessageId(null);
      Alert.alert(
        "Pin this message?",
        "Pinned messages are visible to everyone in this chat.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Pin for everyone",
            onPress: () => {
              void handleSetPinned(selectedMessage.id, true);
            },
          },
        ],
      );
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
        isMine
          ? "Choose how this message should be deleted."
          : "This only removes the message for you.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete for me",
            style: "destructive",
            onPress: () => {
              void deleteDirectMessageForMe(
                selectedMessage.id,
                session.user.id,
              ).then(() =>
                loadConversationMessages(conversationId, session.user.id),
              );
            },
          },
          ...(isMine
            ? [
                {
                  text: "Delete for everyone",
                  style: "destructive" as const,
                  onPress: () => {
                    void deleteDirectMessageForEveryone(
                      selectedMessage.id,
                    ).then(() =>
                      loadConversationMessages(conversationId, session.user.id),
                    );
                  },
                },
              ]
            : []),
        ],
      );
      return;
    }

    if (action === "forward") {
      setSelectedMessageId(null);
      Alert.alert(
        "Forward",
        "Forwarding to existing chats will be wired in the next slice.",
      );
      return;
    }

    if (action === "copy") {
      setSelectedMessageId(null);
      Alert.alert(
        "Copied",
        selectedMessage.body ?? "Only text messages can be copied.",
      );
      return;
    }

    setSelectedMessageId(null);
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
            <Pressable onPress={() => router.replace("/(tabs)/chats")}>
              <GlassSurface
                tint="light"
                radius={headerMetrics.backHeight / 2}
                intensity={40}
                style={[
                  styles.backButton,
                  {
                    height: headerMetrics.backHeight,
                    width: headerMetrics.backWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.backButtonContent,
                    { height: headerMetrics.backHeight },
                  ]}
                >
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
              onPress={() => {
                router.push({
                  pathname: "/(tabs)/chats/info",
                  params: { kind: "direct", id: conversationId },
                } as never);
              }}
              disabled={!conversation}
              style={[
                styles.namePill,
                {
                  borderRadius: headerMetrics.titleHeight / 2,
                  height: headerMetrics.titleHeight,
                  width: headerMetrics.titleWidth,
                },
              ]}
            >
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.topbarName}
              >
                {conversation?.other_user.display_name ?? "Direct message"}
              </Text>
              <Text style={styles.topbarSub} numberOfLines={1}>
                last seen recently
              </Text>
            </Pressable>
          </View>

          <View style={styles.headerSideRight}>
            <Pressable
              onPress={() => setIsPinnedDrawerOpen((current) => !current)}
              style={styles.avatarPressable}
            >
              <LinearGradient
                colors={AVATAR_GRADIENT}
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
                  {getInitials(conversation?.other_user.display_name ?? "DM") ||
                    "DM"}
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
          ref={(ref) => {
            scrollViewRef.current = ref;
          }}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Conversation unavailable</Text>
              <Text style={styles.stateError}>{error}</Text>
            </View>
          ) : null}

          {!error && !conversation && !isThreadLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                Could not find this conversation
              </Text>
              <Text style={styles.stateText}>
                Return to the Chats inbox and open the thread again from your
                mutual connections.
              </Text>
            </View>
          ) : null}

          {!error &&
          conversation &&
          messages.length === 0 &&
          !isThreadLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No messages yet</Text>
              <Text style={styles.stateText}>
                Send the first message to start this direct conversation.
              </Text>
            </View>
          ) : null}

          <View style={styles.messageStack}>
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === session?.user.id;
              const hasImage =
                message.attachment_kind === "image" && message.attachment_url;
              const hasVideo =
                message.attachment_kind === "video" && message.attachment_url;
              const isMediaBubble = Boolean(hasImage || hasVideo);
              const hasAttachmentCard =
                message.attachment_kind !== null &&
                message.attachment_kind !== "image" &&
                message.attachment_kind !== "video" &&
                Boolean(message.attachment_url);
              const poll = pollsByMessageId[message.id];
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
                    isCurrentUser ? styles.bubbleMine : styles.bubbleTheirs,
                    isMediaBubble ? styles.bubbleMedia : null,
                    poll ? styles.pollBubble : null,
                  ]}
                >
                  {hasImage ? (
                    <View style={styles.mediaWrap}>
                      <Pressable
                        onPress={() => {
                          void Linking.openURL(message.attachment_url ?? "");
                        }}
                      >
                        <Image
                          source={{ uri: message.attachment_url ?? "" }}
                          style={styles.attachmentImage}
                          resizeMode="cover"
                        />
                      </Pressable>
                      {message.body ? (
                        <Text
                          style={[
                            styles.attachmentCaption,
                            isCurrentUser
                              ? styles.bubbleTextMine
                              : styles.bubbleTextTheirs,
                          ]}
                        >
                          {message.body}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {hasVideo ? (
                    <View style={styles.mediaWrap}>
                      <Pressable
                        onPress={() => {
                          void Linking.openURL(message.attachment_url ?? "");
                        }}
                      >
                        <LinearGradient
                          colors={["#8B93B8", "#5A6390"]}
                          style={styles.videoAttachment}
                        >
                          <View style={styles.videoPlayCircle}>
                            <Ionicons name="play" size={20} color="#FFFFFF" />
                          </View>
                        </LinearGradient>
                      </Pressable>
                      {message.body ? (
                        <Text
                          style={[
                            styles.attachmentCaption,
                            isCurrentUser
                              ? styles.bubbleTextMine
                              : styles.bubbleTextTheirs,
                          ]}
                        >
                          {message.body}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {hasAttachmentCard ? (
                    <Pressable
                      onPress={() => {
                        void Linking.openURL(message.attachment_url ?? "");
                      }}
                      style={[
                        styles.attachmentCard,
                        isCurrentUser
                          ? styles.attachmentCardMine
                          : styles.attachmentCardTheirs,
                      ]}
                    >
                      <View style={styles.attachmentRow}>
                        <Ionicons
                          name={getAttachmentIconName(
                            message.attachment_kind ?? "file",
                          )}
                          size={22}
                          color={isCurrentUser ? "#FFFFFF" : "#0F1115"}
                        />
                        <View style={styles.attachmentTextColumn}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.attachmentName,
                              isCurrentUser
                                ? styles.bubbleTextMine
                                : styles.bubbleTextTheirs,
                            ]}
                          >
                            {message.attachment_name ?? "Attachment"}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.attachmentMeta,
                              isCurrentUser
                                ? styles.bubbleTimeMine
                                : styles.bubbleTimeTheirs,
                            ]}
                          >
                            {getAttachmentMeta(
                              message.attachment_kind ?? "file",
                              message.attachment_size,
                            )}
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
                  ) : message.body && !isMediaBubble ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        isCurrentUser
                          ? styles.bubbleTextMine
                          : styles.bubbleTextTheirs,
                      ]}
                    >
                      {message.body}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubbleMeta,
                      isMediaBubble ? styles.bubbleMetaMedia : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleTime,
                        isCurrentUser
                          ? styles.bubbleTimeMine
                          : styles.bubbleTimeTheirs,
                      ]}
                    >
                      {formatThreadTime(message.created_at)}
                    </Text>
                    {isCurrentUser ? (
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

          {pendingAttachment ? (
            <View style={styles.pendingAttachment}>
              <View className="flex-row items-center gap-3">
                {pendingAttachment.kind === "image" &&
                pendingAttachment.previewUri ? (
                  <Image
                    source={{ uri: pendingAttachment.previewUri }}
                    style={styles.pendingImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.pendingIcon}>
                    <Ionicons
                      name={getAttachmentIconName(pendingAttachment.kind)}
                      size={22}
                      color="#0F1115"
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
                    {getAttachmentMeta(
                      pendingAttachment.kind,
                      pendingAttachment.size,
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPendingAttachment(null)}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="close" size={14} color="#0F1115" />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              disabled={isSending || isUploadingAttachment || !conversation}
              onPress={openAttachmentMenu}
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
              disabled={isSending || isUploadingAttachment || !conversation}
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
          isGroup={false}
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
    </View>
  );
}

const styles = StyleSheet.create({
  threadRoot: {
    backgroundColor: "#E7EBF7",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
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
  backText: {
    color: "#33333F",
    fontSize: 14,
    fontWeight: "500",
  },
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
  avatarPressable: {
    borderRadius: 20,
  },
  threadAvatar: {
    alignItems: "center",
    borderColor: "rgba(210,225,244,0.9)",
    borderWidth: 2,
    justifyContent: "center",
  },
  threadAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
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
  pinnedContent: {
    flex: 1,
    minWidth: 0,
  },
  pinnedLabel: {
    color: "#4230A0",
    fontSize: 11,
    fontWeight: "700",
  },
  pinnedText: {
    color: "#4B4B57",
    fontSize: 12.5,
    marginTop: 1,
  },
  pinnedClose: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  messageStack: {
    gap: 8,
  },
  stateCard: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  stateTitle: {
    color: "#10121F",
    fontSize: 17,
    fontWeight: "800",
  },
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
  pollBubble: {
    minWidth: 260,
    maxWidth: 300,
    width: "88%",
  },
  bubbleMedia: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
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
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bubbleTextTheirs: {
    color: "#1B1D29",
  },
  bubbleMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-end",
    marginTop: 2,
  },
  bubbleMetaMedia: {
    paddingBottom: 2,
    paddingHorizontal: 6,
  },
  bubbleTime: {
    fontSize: 10.5,
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.74)",
  },
  bubbleTimeTheirs: {
    color: "#6B6F7F",
  },
  pinPill: {
    display: "none",
  },
  pinPillText: {
    color: "#6B6F7F",
    fontSize: 11,
    fontWeight: "700",
  },
  attachmentImage: {
    backgroundColor: "#DDE5EF",
    borderRadius: 14,
    height: 168,
    width: 232,
  },
  mediaWrap: {
    gap: 6,
  },
  videoAttachment: {
    alignItems: "center",
    borderRadius: 14,
    height: 168,
    justifyContent: "center",
    overflow: "hidden",
    width: 232,
  },
  videoPlayCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  attachmentCaption: {
    fontSize: 14,
    lineHeight: 19,
    paddingBottom: 2,
    paddingHorizontal: 7,
  },
  attachmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 3,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: 220,
  },
  attachmentCardMine: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.32)",
  },
  attachmentCardTheirs: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
  },
  attachmentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  attachmentTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  attachmentMeta: {
    fontSize: 11,
    marginTop: 1,
  },
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
  composerPanel: {
    marginBottom: 12,
  },
  pendingAttachment: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  pendingImage: {
    backgroundColor: "#DDE5EF",
    borderRadius: 14,
    height: 56,
    width: 56,
  },
  pendingIcon: {
    alignItems: "center",
    backgroundColor: "rgba(238,242,247,0.9)",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
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
