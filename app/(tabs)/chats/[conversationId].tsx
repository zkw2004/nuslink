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
import { uploadChatAttachment } from "@services/directMessagesService";
import { useAuthStore, useDirectMessagesStore } from "@store/index";

type PendingAttachment = {
  bytes: ArrayBuffer;
  previewUri: string | null;
  name: string;
  mimeType: string;
  size: number | null;
  kind: "image" | "file";
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

function decodeBase64(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "File attachment";
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
    default:
      return "application/octet-stream";
  }
}

function getDefaultAttachmentName(kind: "image" | "file", mimeType: string) {
  if (kind === "file") {
    return "attachment";
  }

  if (mimeType === "image/png") {
    return "photo.png";
  }

  if (mimeType === "image/webp") {
    return "photo.webp";
  }

  return "photo.jpg";
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

  const [messageDraft, setMessageDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const conversation = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversationId, conversations],
  );
  const messages = messagesByConversation[conversationId] ?? [];
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return;
    }

    void refreshInbox(session.user.id).then(() => {
      void loadConversationMessages(conversationId);
    });
  }, [conversationId, loadConversationMessages, refreshInbox, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !conversationId) {
      return undefined;
    }

    return subscribeToConversation(conversationId, session.user.id);
  }, [conversationId, session?.user.id, subscribeToConversation]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollViewRef]);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Photo library permission is needed to attach an image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      base64: true,
      mediaTypes: ["images"],
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      Alert.alert("Could not read image", "Try choosing a different image.");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";

    setPendingAttachment({
      bytes: decodeBase64(asset.base64),
      previewUri: asset.uri,
      name: asset.fileName ?? getDefaultAttachmentName("image", mimeType),
      mimeType,
      size: asset.fileSize ?? null,
      kind: "image",
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

  async function handleSendMessage() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before sending messages.");
      return;
    }

    const trimmedMessage = messageDraft.trim();

    if (!trimmedMessage && !pendingAttachment) {
      Alert.alert("Write a message", "Type something or attach a file before sending.");
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
            const hasFile = message.attachment_kind === "file" && message.attachment_url;

            return (
              <View
                key={message.id}
                className={`max-w-[88%] rounded-[18px] px-4 py-3 ${
                  isCurrentUser
                    ? "self-end bg-[#0F1115]"
                    : "self-start bg-white"
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

                {hasFile ? (
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
                        name={{
                          ios: "doc.fill",
                          android: "description",
                          web: "description",
                        }}
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
                          {formatFileSize(message.attachment_size)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ) : null}

                {message.body ? (
                  <Text
                    className={`text-[14px] leading-6 ${
                      isCurrentUser ? "text-white" : "text-[#0F1115]"
                    }`}
                  >
                    {message.body}
                  </Text>
                ) : null}
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
                      name={{
                        ios: "doc.fill",
                        android: "description",
                        web: "description",
                      }}
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
                    {formatFileSize(pendingAttachment.size)}
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

          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            placeholder="Write a message"
            placeholderTextColor="#9AA0AB"
            multiline
            className="min-h-[52px] text-[14px] leading-6 text-[#0F1115]"
          />

          <View className="mt-3 flex-row items-center gap-2">
            <Pressable
              disabled={isSending || isUploadingAttachment || !conversation}
              onPress={() => {
                void handlePickImage();
              }}
              className="h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F7]"
            >
              <SymbolView
                name={{ ios: "photo", android: "image", web: "image" }}
                size={20}
                tintColor="#0F1115"
              />
            </Pressable>
            <Pressable
              disabled={isSending || isUploadingAttachment || !conversation}
              onPress={() => {
                void handlePickFile();
              }}
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
            <View className="flex-1">
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
