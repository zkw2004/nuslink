import { supabase } from "@lib/supabase";
import type {
  ConnectedProfilePreview,
  DirectConversationSummary,
  DirectMessage,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type ConnectionRow = Database["public"]["Tables"]["connections"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type DirectConversationRow =
  Database["public"]["Tables"]["direct_conversations"]["Row"];
type DirectConversationMemberRow =
  Database["public"]["Tables"]["direct_conversation_members"]["Row"];
type DirectMessageRow = Database["public"]["Tables"]["direct_messages"]["Row"];

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

export async function fetchDirectConversations(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("direct_conversation_members")
    .select("*")
    .eq("user_id", userId);

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
  for (const message of (messageRows ?? []) as DirectMessageRow[]) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
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
        last_message_preview: lastMessage?.body ?? null,
        last_message_at: lastMessage?.created_at ?? null,
        updated_at: conversation.updated_at,
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

  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DirectMessageRow[]).map(
    (message): DirectMessage => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      body: message.body,
      created_at: message.created_at,
    }),
  );
}

export async function sendDirectMessage(conversationId: string, body: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("send_direct_message", {
    conversation_id_input: conversationId,
    body_input: body,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
