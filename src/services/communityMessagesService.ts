import { supabase } from "@lib/supabase";
import type {
  CommunityChatMessage,
  CommunityChatSummary,
  ConnectedProfilePreview,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type CommunityMemberRow = Database["public"]["Tables"]["community_members"]["Row"];
type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
type CommunityMessageRow = Database["public"]["Tables"]["community_messages"]["Row"];
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
    created_at: message.created_at,
    sender_profile: senderProfile,
  };
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
        last_message_preview: lastMessage?.body ?? null,
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
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error("Message cannot be empty.");
  }

  const { error } = await supabase.from("community_messages").insert({
    community_id: communityId,
    sender_id: senderId,
    body: trimmedBody,
  });

  if (error) {
    throw new Error(error.message);
  }
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
