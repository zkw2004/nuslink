import { supabase } from "@lib/supabase";
import type {
  ConnectedProfilePreview,
  GroupChatMessage,
  GroupChatSummary,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type GroupMessageRow = Database["public"]["Tables"]["group_messages"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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

function getMessagePreview(message: GroupMessageRow) {
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

function mapGroupMessage(
  message: GroupMessageRow,
  senderProfile: ConnectedProfilePreview,
): GroupChatMessage {
  return {
    id: message.id,
    group_id: message.group_id,
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

export async function fetchJoinedGroupChats(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("group_members")
    .select("*")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const groupIds = (membershipRows ?? []).map(
    (membership: GroupMemberRow) => membership.group_id,
  );

  if (groupIds.length === 0) {
    return [] as GroupChatSummary[];
  }

  const [
    { data: groupRows, error: groupsError },
    { data: messageRows, error: messagesError },
  ] = await Promise.all([
    supabase.from("groups").select("*").in("id", groupIds).eq("is_active", true),
    supabase
      .from("group_messages")
      .select("*")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
  ]);

  if (groupsError) {
    throw new Error(groupsError.message);
  }

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const membershipByGroup = new Map<string, GroupMemberRow>();
  const lastMessageByGroup = new Map<string, GroupMessageRow>();
  const unreadCountByGroup = new Map<string, number>();

  for (const membership of (membershipRows ?? []) as GroupMemberRow[]) {
    membershipByGroup.set(membership.group_id, membership);
  }

  for (const message of (messageRows ?? []) as GroupMessageRow[]) {
    if (!lastMessageByGroup.has(message.group_id)) {
      lastMessageByGroup.set(message.group_id, message);
    }

    const membership = membershipByGroup.get(message.group_id);
    const lastReadTime = membership?.last_read_at
      ? new Date(membership.last_read_at).getTime()
      : 0;
    const messageTime = new Date(message.created_at).getTime();

    if (message.sender_id !== userId && messageTime > lastReadTime) {
      unreadCountByGroup.set(
        message.group_id,
        (unreadCountByGroup.get(message.group_id) ?? 0) + 1,
      );
    }
  }

  return ((groupRows ?? []) as GroupRow[])
    .map((group) => {
      const lastMessage = lastMessageByGroup.get(group.id);

      return {
        id: group.id,
        name: group.name,
        type: group.type,
        module_code: group.module_code,
        privacy: group.privacy,
        semester: group.semester,
        created_at: group.created_at,
        last_message_preview: lastMessage ? getMessagePreview(lastMessage) : null,
        last_message_at: lastMessage?.created_at ?? null,
        unread_count: unreadCountByGroup.get(group.id) ?? 0,
      } satisfies GroupChatSummary;
    })
    .sort((left, right) => {
      const rightTime = new Date(right.last_message_at ?? right.created_at).getTime();
      const leftTime = new Date(left.last_message_at ?? left.created_at).getTime();
      return rightTime - leftTime;
    });
}

export async function fetchGroupMessages(groupId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const messages = (data ?? []) as GroupMessageRow[];
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

      return mapGroupMessage(message, senderProfile);
    })
    .filter((message): message is GroupChatMessage => message !== null);
}

export async function sendGroupMessage(
  groupId: string,
  body: string,
  senderId: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error("Message cannot be empty.");
  }

  const { error } = await supabase.from("group_messages").insert({
    group_id: groupId,
    sender_id: senderId,
    body: trimmedBody,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function markGroupChatRead(groupId: string, userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("group_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToGroupMessages(groupId: string, onChange: () => void) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const supabaseClient = supabase;
  const channelId = `group:${groupId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  const channel = supabaseClient
    .channel(`group-messages:${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${groupId}`,
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
