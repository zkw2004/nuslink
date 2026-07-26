import { supabase } from "@lib/supabase";
import type {
  ChatAttachmentKind,
  ConnectedProfilePreview,
  DirectConversationSummary,
  DirectMessageAttachmentInput,
  DirectMessage,
  ModerationOutcome,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type ConnectionRow = Database["public"]["Tables"]["connections"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type DirectConversationRow =
  Database["public"]["Tables"]["direct_conversations"]["Row"];
type DirectConversationMemberRow =
  Database["public"]["Tables"]["direct_conversation_members"]["Row"];
type DirectMessageRow = Database["public"]["Tables"]["direct_messages"]["Row"];

type ChatAttachmentUpload = {
  bytes: ArrayBuffer;
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  kind: ChatAttachmentKind;
};

type ConversationListScope = "active" | "archived" | "all";

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

function mapProfileToPreview(profile: ProfileRow): ConnectedProfilePreview {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    major: profile.major,
    year_of_study: profile.year_of_study,
    badge_tier: profile.badge_tier,
  };
}

function getFileExtension(uri: string, mimeType: string, name: string) {
  const source = name || uri;
  const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);

  if (match?.[1]) {
    return match[1].toLowerCase();
  }

  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/x-m4v":
      return "m4v";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    default:
      return "bin";
  }
}

function sanitizeFileName(name: string) {
  const trimmedName = name.trim() || "attachment";
  return trimmedName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

function stripFileExtension(name: string) {
  return name.replace(/\.[a-zA-Z0-9]+$/, "") || "attachment";
}

function mapDirectMessage(message: DirectMessageRow): DirectMessage {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    body: message.body,
    attachment_url: message.attachment_url,
    attachment_name: message.attachment_name,
    attachment_mime_type: message.attachment_mime_type,
    attachment_size: message.attachment_size,
    attachment_kind: message.attachment_kind,
    created_at: message.created_at,
    deleted_at: message.deleted_at,
    edited_at: message.edited_at,
    moderation_outcome: message.moderation_outcome,
  };
}

function getMessagePreview(message: DirectMessageRow) {
  if (message.moderation_outcome === "blocked") {
    return "Message removed";
  }

  if (message.moderation_outcome === "flagged") {
    return "Message hidden for review";
  }

  if (message.body?.trim()) {
    return message.body;
  }

  if (message.attachment_kind === "image") {
    return "Photo attachment";
  }

  if (message.attachment_kind === "video") {
    return "Video attachment";
  }

  if (message.attachment_kind === "audio") {
    return "Audio attachment";
  }

  if (message.attachment_url) {
    return message.attachment_name
      ? `File: ${message.attachment_name}`
      : "File attachment";
  }

  return null;
}

function buildConnectedUserIds(userId: string, connections: ConnectionRow[]) {
  return connections.map((connection) =>
    connection.user_a_id === userId ? connection.user_b_id : connection.user_a_id,
  );
}

async function fetchConnectionRows(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data: connectionsAsUserA, error: connectionsAError },
    { data: connectionsAsUserB, error: connectionsBError },
  ] = await Promise.all([
    supabase.from("connections").select("*").eq("user_a_id", userId),
    supabase.from("connections").select("*").eq("user_b_id", userId),
  ]);

  if (connectionsAError) {
    throw new Error(connectionsAError.message);
  }

  if (connectionsBError) {
    throw new Error(connectionsBError.message);
  }

  return [...(connectionsAsUserA ?? []), ...(connectionsAsUserB ?? [])];
}

async function fetchProfilesByIds(userIds: string[]) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (userIds.length === 0) {
    return [] as ProfileRow[];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, major, year_of_study, badge_tier")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileRow[]) ?? [];
}

export async function fetchConnectedProfiles(userId: string) {
  const connections = await fetchConnectionRows(userId);
  const connectedUserIds = buildConnectedUserIds(userId, connections);
  const profiles = await fetchProfilesByIds(connectedUserIds);

  return profiles
    .map(mapProfileToPreview)
    .sort((left, right) =>
      left.display_name.localeCompare(right.display_name, undefined, {
        sensitivity: "base",
      }),
    );
}

export async function fetchDirectConversations(
  userId: string,
  scope: ConversationListScope = "active",
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  let membershipQuery = supabase
    .from("direct_conversation_members")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (scope === "active") {
    membershipQuery = membershipQuery.is("archived_at", null);
  } else if (scope === "archived") {
    membershipQuery = membershipQuery.not("archived_at", "is", null);
  }

  const { data: membershipRows, error: membershipError } = await membershipQuery;

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const conversationIds = (membershipRows ?? []).map(
    (membership) => membership.conversation_id,
  );

  if (conversationIds.length === 0) {
    return [] as DirectConversationSummary[];
  }

  const [
    { data: conversationRows, error: conversationsError },
    { data: allMemberRows, error: allMembersError },
    { data: messageRows, error: messagesError },
  ] = await Promise.all([
    supabase
      .from("direct_conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("direct_conversation_members")
      .select("*")
      .in("conversation_id", conversationIds),
    supabase
      .from("direct_messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (conversationsError) {
    throw new Error(conversationsError.message);
  }

  if (allMembersError) {
    throw new Error(allMembersError.message);
  }

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const otherUserIds = Array.from(
    new Set(
      (allMemberRows ?? [])
        .filter((member) => member.user_id !== userId)
        .map((member) => member.user_id),
    ),
  );
  const profiles = await fetchProfilesByIds(otherUserIds);
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, mapProfileToPreview(profile)]),
  );
  const otherUserIdByConversation = new Map<string, string>();

  for (const member of (allMemberRows ?? []) as DirectConversationMemberRow[]) {
    if (member.user_id !== userId) {
      otherUserIdByConversation.set(member.conversation_id, member.user_id);
    }
  }

  const lastMessageByConversation = new Map<string, DirectMessageRow>();
  const ownMembershipByConversation = new Map<string, DirectConversationMemberRow>();
  const unreadCountByConversation = new Map<string, number>();

  for (const membership of (membershipRows ?? []) as DirectConversationMemberRow[]) {
    ownMembershipByConversation.set(membership.conversation_id, membership);
  }

  for (const message of (messageRows ?? []) as DirectMessageRow[]) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
    }

    const membership = ownMembershipByConversation.get(message.conversation_id);
    const lastReadTime = membership?.last_read_at
      ? new Date(membership.last_read_at).getTime()
      : 0;
    const messageTime = new Date(message.created_at).getTime();

    if (message.sender_id !== userId && messageTime > lastReadTime) {
      unreadCountByConversation.set(
        message.conversation_id,
        (unreadCountByConversation.get(message.conversation_id) ?? 0) + 1,
      );
    }
  }

  const mappedConversations = ((conversationRows ?? []) as DirectConversationRow[])
    .map((conversation) => {
      const otherUserId = otherUserIdByConversation.get(conversation.id);
      const otherUser = otherUserId ? profilesById.get(otherUserId) : undefined;

      if (!otherUser) {
        return null;
      }

      const lastMessage = lastMessageByConversation.get(conversation.id);

      return {
        id: conversation.id,
        other_user: otherUser,
        last_message_preview: lastMessage ? getMessagePreview(lastMessage) : null,
        last_message_at: lastMessage?.created_at ?? null,
        updated_at: conversation.updated_at,
        unread_count: unreadCountByConversation.get(conversation.id) ?? 0,
        archived_at: ownMembershipByConversation.get(conversation.id)?.archived_at ?? null,
        deleted_at: ownMembershipByConversation.get(conversation.id)?.deleted_at ?? null,
        muted_at: ownMembershipByConversation.get(conversation.id)?.muted_at ?? null,
      };
    })
    .filter(
      (conversation): conversation is DirectConversationSummary =>
        conversation !== null,
    );

  const dedupedConversations = new Map<string, DirectConversationSummary>();

  for (const conversation of mappedConversations) {
    const existingConversation = dedupedConversations.get(
      conversation.other_user.id,
    );

    if (!existingConversation) {
      dedupedConversations.set(conversation.other_user.id, conversation);
      continue;
    }

    const existingTime = new Date(
      existingConversation.last_message_at ?? existingConversation.updated_at,
    ).getTime();
    const nextTime = new Date(
      conversation.last_message_at ?? conversation.updated_at,
    ).getTime();
    const shouldReplace =
      nextTime > existingTime ||
      (
        nextTime === existingTime &&
        conversation.last_message_preview !== null &&
        existingConversation.last_message_preview === null
      );

    if (shouldReplace) {
      dedupedConversations.set(conversation.other_user.id, conversation);
    }
  }

  return Array.from(dedupedConversations.values()).sort(
    (left, right) =>
      new Date(right.last_message_at ?? right.updated_at).getTime() -
      new Date(left.last_message_at ?? left.updated_at).getTime(),
  );
}

export async function getOrCreateDirectConversation(otherUserId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_user_id_input: otherUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function fetchDirectMessages(conversationId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data, error },
    { data: hiddenRows, error: hiddenError },
  ] = await Promise.all([
    supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_message_user_deletions")
      .select("direct_message_id")
      .not("direct_message_id", "is", null),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (hiddenError) {
    throw new Error(hiddenError.message);
  }

  const hiddenMessageIds = new Set(
    (hiddenRows ?? [])
      .map((row) => row.direct_message_id)
      .filter((messageId): messageId is string => messageId !== null),
  );

  return ((data ?? []) as DirectMessageRow[])
    .filter((message) => !hiddenMessageIds.has(message.id))
    .map(
    (message): DirectMessage => mapDirectMessage(message),
  );
}

export async function markDirectConversationRead(
  conversationId: string,
  userId: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markDirectConversationsRead(
  conversationIds: string[],
  userId: string,
) {
  if (!supabase || conversationIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function archiveDirectConversations(
  conversationIds: string[],
  userId: string,
) {
  if (!supabase || conversationIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({
      archived_at: new Date().toISOString(),
      deleted_at: null,
    })
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function unarchiveDirectConversations(
  conversationIds: string[],
  userId: string,
) {
  if (!supabase || conversationIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({
      archived_at: null,
      deleted_at: null,
    })
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDirectConversations(
  conversationIds: string[],
  _userId: string,
) {
  if (!supabase || conversationIds.length === 0) {
    return;
  }

  for (const conversationId of conversationIds) {
    const { error } = await supabase.rpc("delete_direct_conversation_for_all", {
      conversation_id_input: conversationId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function muteDirectConversations(
  conversationIds: string[],
  userId: string,
  muted: boolean,
) {
  if (!supabase || conversationIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({ muted_at: muted ? new Date().toISOString() : null })
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function editDirectMessage(messageId: string, body: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error("Message cannot be empty.");
  }

  const { error } = await supabase
    .from("direct_messages")
    .update({ body: trimmedBody, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDirectMessageForEveryone(messageId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("direct_messages")
    .update({
      body: null,
      attachment_kind: null,
      attachment_mime_type: null,
      attachment_name: null,
      attachment_size: null,
      attachment_url: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDirectMessageForMe(
  messageId: string,
  userId: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("chat_message_user_deletions")
    .insert({
      direct_message_id: messageId,
      user_id: userId,
    });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function restoreDirectConversation(
  conversationId: string,
  userId: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("direct_conversation_members")
    .update({
      archived_at: null,
      deleted_at: null,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadChatAttachment(
  attachment: ChatAttachmentUpload,
): Promise<DirectMessageAttachmentInput> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Please sign in again.");
  }

  const safeName = sanitizeFileName(attachment.name);
  const safeBaseName = stripFileExtension(safeName);
  const extension = getFileExtension(
    attachment.uri,
    attachment.mimeType,
    safeName,
  );
  const filePath = `${userData.user.id}/${Date.now()}-${safeBaseName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(filePath, attachment.bytes, {
      contentType: attachment.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    name: safeName,
    mime_type: attachment.mimeType,
    size: attachment.size,
    kind: attachment.kind,
  };
}

export async function sendDirectMessage(
  conversationId: string,
  body: string,
  attachment?: DirectMessageAttachmentInput | null,
  moderationOutcome: ModerationOutcome = "allowed",
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("send_direct_message", {
    conversation_id_input: conversationId,
    body_input: body.trim() || null,
    attachment_url_input: attachment?.url ?? null,
    attachment_name_input: attachment?.name ?? null,
    attachment_mime_type_input: attachment?.mime_type ?? null,
    attachment_size_input: attachment?.size ?? null,
    attachment_kind_input: attachment?.kind ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const messageId = typeof data === "string" ? data : null;
  if (messageId) {
    const { error: updateError } = await supabase
      .from("direct_messages")
      .update({ moderation_outcome: moderationOutcome })
      .eq("id", messageId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return messageId;
}

export function subscribeToDirectMessages(
  conversationId: string,
  onMessage: (message: DirectMessage) => void,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const supabaseClient = supabase;
  const channel = supabaseClient.channel(
    `direct-messages:${conversationId}:${Date.now()}`,
  );

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "direct_messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      onMessage(mapDirectMessage(payload.new as DirectMessageRow));
    },
  );

  channel.subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}
