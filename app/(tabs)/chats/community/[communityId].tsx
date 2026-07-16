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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton } from "@components/shared";
import type { ChatAttachmentKind } from "@appTypes/index";
import {
  ChatPollCard,
  PinnedMessagesDrawer,
  PollComposer,
  type PinnedMessagePreview,
} from "@features/chat/ChatFeaturePanels";
import { uploadCommunityChatAttachment } from "@services/communityMessagesService";
import {
  useAuthStore,
  useChatFeaturesStore,
  useCommunityMessagesStore,
  useSharedResourcesStore,
} from "@store/index";

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

type PendingAttachment = {
  bytes: ArrayBuffer;
  previewUri: string | null;
  name: string;
  mimeType: string;
  size: number | null;
  kind: ChatAttachmentKind;
};

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;
const COMMUNITY_AVATAR_GRADIENT = ["#F8C949", "#EAA31F"] as const;

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
      return "image/jpeg";
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

function getAttachmentIconName(kind: ChatAttachmentKind): keyof typeof Ionicons.glyphMap {
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

export default function CommunityChatThreadScreen() {
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communityId = typeof params.communityId === "string" ? params.communityId : "";
  const session = useAuthStore((state) => state.session);
  const communityChats = useCommunityMessagesStore((state) => state.communityChats);
  const archivedCommunityChats = useCommunityMessagesStore(
    (state) => state.archivedCommunityChats,
  );
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

  const communityResourcesById = useSharedResourcesStore(
    (state) => state.communityResources,
  );
  const isResourcesLoading = useSharedResourcesStore((state) => state.isLoading);
  const isUploadingResource = useSharedResourcesStore((state) => state.isUploading);
  const resourcesError = useSharedResourcesStore((state) => state.error);
  const loadCommunityResources = useSharedResourcesStore(
    (state) => state.loadCommunityResources,
  );
  const uploadCommunityResource = useSharedResourcesStore(
    (state) => state.uploadCommunityResource,
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
  const scrollViewRef = useRef<ScrollView | null>(null);

  const community = useMemo(
    () =>
      [...communityChats, ...archivedCommunityChats].find(
        (item) => item.id === communityId,
      ) ?? null,
    [archivedCommunityChats, communityChats, communityId],
  );
  const messages = useMemo(
    () => messagesByCommunity[communityId] ?? [],
    [communityId, messagesByCommunity],
  );
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages]);
  const chatKey = `community:${communityId}`;
  const pinnedMessages = pinnedMessagesByChatKey[chatKey] ?? [];
  const communityResources = useMemo(
    () => communityResourcesById[communityId] ?? [],
    [communityId, communityResourcesById],
  );

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return;
    }

    void refreshCommunityChats(session.user.id).then(() => {
      void loadCommunityMessages(communityId, session.user.id);
    });
  }, [communityId, loadCommunityMessages, refreshCommunityChats, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return;
    }

    void loadCommunityResources(communityId);
  }, [communityId, loadCommunityResources, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return undefined;
    }

    return subscribeToCommunity(communityId, session.user.id);
  }, [communityId, session?.user.id, subscribeToCommunity]);

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return;
    }

    void loadFeatures("community", communityId, messageIds, session.user.id);
  }, [communityId, loadFeatures, messageIds, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return undefined;
    }

    return subscribeToFeatureChanges(
      "community",
      communityId,
      messageIds,
      session.user.id,
    );
  }, [communityId, messageIds, session?.user.id, subscribeToFeatureChanges]);

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
      type: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav"],
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

    if (!messageDraft.trim() && !pendingAttachment) {
      Alert.alert("Write a message", "Type something or attach media before sending.");
      return;
    }

    setIsUploadingAttachment(true);

    try {
      const uploadedAttachment = pendingAttachment
        ? await uploadCommunityChatAttachment({
            bytes: pendingAttachment.bytes,
            uri: pendingAttachment.previewUri ?? pendingAttachment.name,
            name: pendingAttachment.name,
            mimeType: pendingAttachment.mimeType,
            size: pendingAttachment.size,
            kind: pendingAttachment.kind,
          })
        : null;

      await sendMessage(
        communityId,
        messageDraft.trim(),
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

  async function handleUploadResource() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before uploading files.");
      return;
    }

    let documentPicker: DocumentPickerModule;

    try {
      documentPicker = (await import("expo-document-picker")) as DocumentPickerModule;
    } catch {
      Alert.alert(
        "File picker unavailable",
        "Install project dependencies again on this machine before uploading files.",
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
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const bytes = await new ExpoFile(asset.uri).arrayBuffer();

    try {
      await uploadCommunityResource(communityId, {
        bytes,
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
        size: asset.size ?? bytes.byteLength,
      });
    } catch (uploadError) {
      Alert.alert(
        "Could not upload resource",
        uploadError instanceof Error ? uploadError.message : "Please try again.",
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
      await createPoll("community", communityId, trimmedQuestion, trimmedOptions);
      await Promise.all([
        loadCommunityMessages(communityId, session.user.id),
        refreshCommunityChats(session.user.id),
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
        "community",
        communityId,
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
        "community",
        communityId,
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
        "community",
        communityId,
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

  const pinnedPreviews = pinnedMessages
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
          message.attachment_name ??
          "Attachment",
        senderName:
          message.sender_id === session?.user.id
            ? "You"
            : message.sender_profile.display_name,
      };
    })
    .filter((message): message is PinnedMessagePreview => message !== null);

  return (
    <View style={styles.threadRoot}>
      <LinearGradient
        colors={APP_GRADIENT}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topbar}>
          <GlassButton
            variant="light"
            onPress={() => router.replace("/(tabs)/chats")}
            style={styles.backButton}
          >
            <View style={styles.backContent}>
              <Ionicons name="chevron-back" size={16} color="#33333F" />
              <Text style={styles.backText}>Back</Text>
            </View>
          </GlassButton>

          <Pressable
            onPress={() => {
              router.push(`/chats/community-media/${communityId}` as never);
            }}
            disabled={!community}
            style={styles.topbarCenter}
          >
            <Text style={styles.topbarName} numberOfLines={1}>
              {community?.name ?? "Community chat"}
            </Text>
            <Text style={styles.topbarSub}>community member chat</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsPinnedDrawerOpen((current) => !current)}
            style={styles.avatarPressable}
          >
            <LinearGradient colors={COMMUNITY_AVATAR_GRADIENT} style={styles.threadAvatar}>
              <Text style={styles.threadAvatarText}>
                {getInitials(community?.name ?? "Community") || "C"}
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
            <Text style={styles.stateTitle}>Community chat unavailable</Text>
            <Text style={styles.stateError}>{error}</Text>
          </View>
        ) : null}

        {!error && !community && !isThreadLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not find this community chat</Text>
            <Text style={styles.stateText}>
              Return to Discover or the Chats tab and open the community again.
            </Text>
          </View>
        ) : null}

        {!error && community && messages.length === 0 && !isThreadLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No messages yet</Text>
            <Text style={styles.stateText}>
              Send the first message to kick off this community space.
            </Text>
          </View>
        ) : null}

        <View style={styles.messageStack}>
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
                style={[
                  styles.bubble,
                  isCurrentUser ? styles.bubbleMine : styles.bubbleTheirs,
                  poll ? styles.pollBubble : null,
                ]}
              >
                {!isCurrentUser ? (
                  <Text style={styles.senderLabel}>
                    {message.sender_profile.display_name}
                  </Text>
                ) : null}

                {hasImage ? (
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
                      <Ionicons
                        name={getAttachmentIconName(message.attachment_kind ?? "file")}
                        size={22}
                        color={isCurrentUser ? "#FFFFFF" : "#0F1115"}
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
                ) : message.body ? (
                  <Text
                    style={[
                      styles.bubbleText,
                      isCurrentUser ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                    ]}
                  >
                    {message.body}
                  </Text>
                ) : null}

                <View style={styles.bubbleMeta}>
                  <Text
                    style={[
                      styles.bubbleTime,
                      isCurrentUser ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
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

          {pendingAttachment ? (
            <View style={styles.pendingAttachment}>
              <View className="flex-row items-center gap-3">
                {pendingAttachment.kind === "image" && pendingAttachment.previewUri ? (
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
                    {getAttachmentMeta(pendingAttachment.kind, pendingAttachment.size)}
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
              disabled={isSending || isUploadingAttachment || !community}
              onPress={openAttachmentMenu}
              style={styles.composerIcon}
            >
              <Ionicons name="attach" size={22} color="#7A7A8C" />
            </Pressable>

            <Pressable
              disabled={isSending || isUploadingAttachment || !community}
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
              disabled={isSending || isUploadingAttachment || !community}
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
  attachmentImage: {
    backgroundColor: "#DDE5EF",
    borderRadius: 16,
    height: 192,
    marginBottom: 12,
    width: 256,
  },
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
