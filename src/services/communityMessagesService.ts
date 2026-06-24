import { supabase } from "@lib/supabase";
import type {
  ChatAttachmentKind,
  CommunityChatMessage,
  CommunityChatSummary,
  ConnectedProfilePreview,
  DirectMessageAttachmentInput,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type CommunityMemberRow = Database["public"]["Tables"]["community_members"]["Row"];
type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
type CommunityMessageRow = Database["public"]["Tables"]["community_messages"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type CommunityAttachmentUpload = {
  bytes: ArrayBuffer;
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  kind: ChatAttachmentKind;
};

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

function mapCommunityMessage(
  message: CommunityMessageRow,
  senderProfile: ConnectedProfilePreview,
): CommunityChatMessage {
  return {
    id: message.id,
    community_id: message.community_id,
    sender_id: message.sender_id,
    body: message.body,
    attachment_url: message.attachment_url,
    attachment_name: message.attachment_name,
    attachment_mime_type: message.attachment_mime_type,
    attachment_size: message.attachment_size,
    attachment_kind: message.attachment_kind,
    created_at: message.created_at,
    sender_profile: senderProfile,
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

export async function fetchJoinedCommunityChats(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const communityIds = (membershipRows ?? []).map(
    (membership: Pick<CommunityMemberRow, "community_id">) => membership.community_id,
  );

  if (communityIds.length === 0) {
    return [] as CommunityChatSummary[];
  }

  const [
    { data: communityRows, error: communitiesError },
    { data: messageRows, error: messagesError },
  ] = await Promise.all([
    supabase
      .from("communities")
      .select("*")
      .in("id", communityIds)
      .eq("is_active", true),
    supabase
      .from("community_messages")
      .select("*")
      .in("community_id", communityIds)
      .order("created_at", { ascending: false }),
  ]);

  if (communitiesError) {
    throw new Error(communitiesError.message);
  }

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const lastMessageByCommunity = new Map<string, CommunityMessageRow>();
  for (const message of (messageRows ?? []) as CommunityMessageRow[]) {
    if (!lastMessageByCommunity.has(message.community_id)) {
      lastMessageByCommunity.set(message.community_id, message);
    }
  }

  return ((communityRows ?? []) as CommunityRow[])
    .map((community) => {
      const lastMessage = lastMessageByCommunity.get(community.id);

      return {
        id: community.id,
        name: community.name,
        description: community.description,
        type: community.type,
        join_policy: community.join_policy,
        tags: community.tags ?? [],
        creator_id: community.creator_id,
        last_message_preview:
          lastMessage?.body ??
          (lastMessage?.attachment_kind === "image"
            ? "Photo attachment"
            : lastMessage?.attachment_kind === "video"
              ? "Video attachment"
              : lastMessage?.attachment_kind === "audio"
                ? "Audio attachment"
                : lastMessage?.attachment_url
                  ? `File: ${lastMessage.attachment_name ?? "Attachment"}`
                  : null),
        last_message_at: lastMessage?.created_at ?? null,
      } satisfies CommunityChatSummary;
    })
    .sort((left, right) => {
      const rightTime = new Date(right.last_message_at ?? 0).getTime();
      const leftTime = new Date(left.last_message_at ?? 0).getTime();
      return rightTime - leftTime;
    });
}

export async function fetchCommunityMessages(communityId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("community_messages")
    .select("*")
    .eq("community_id", communityId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const messages = (data ?? []) as CommunityMessageRow[];
  const senderIds = Array.from(new Set(messages.map((message) => message.sender_id)));
  const profiles = await fetchProfilesByIds(senderIds);
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, mapProfileToPreview(profile)]),
  );

  return messages
    .map((message) => {
      const senderProfile = profilesById.get(message.sender_id);

      if (!senderProfile) {
        return null;
      }

      return mapCommunityMessage(message, senderProfile);
    })
    .filter((message): message is CommunityChatMessage => message !== null);
}

export async function sendCommunityMessage(
  communityId: string,
  body: string,
  senderId: string,
  attachment?: DirectMessageAttachmentInput | null,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedBody = body.trim() || null;

  if (!trimmedBody && !attachment?.url) {
    throw new Error("Message cannot be empty.");
  }

  const { error } = await supabase.from("community_messages").insert({
    community_id: communityId,
    sender_id: senderId,
    body: trimmedBody,
    attachment_url: attachment?.url ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime_type: attachment?.mime_type ?? null,
    attachment_size: attachment?.size ?? null,
    attachment_kind: attachment?.kind ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadCommunityChatAttachment(
  attachment: CommunityAttachmentUpload,
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

export function subscribeToCommunityMessages(
  communityId: string,
  onChange: () => void,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const supabaseClient = supabase;
  const channel = supabaseClient
    .channel(`community-messages:${communityId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "community_messages",
        filter: `community_id=eq.${communityId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}
