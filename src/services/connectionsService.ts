import { supabase } from "@lib/supabase";
import type {
  ConnectionRelationshipStatus,
  ConnectionPreviewProfile,
  IncomingConnectionRequest,
} from "@appTypes/index";
import type { Database } from "@appTypes/database";

type ConnectionRequestRow =
  Database["public"]["Tables"]["connection_requests"]["Row"];
type ConnectionRow = Database["public"]["Tables"]["connections"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type ConnectionStatePayload = {
  connectedUserIds: string[];
  incomingRequests: IncomingConnectionRequest[];
  incomingRequesterIds: string[];
  outgoingRequestRecipientIds: string[];
};

function mapProfileToPreview(profile: ProfileRow): ConnectionPreviewProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    major: profile.major,
    year_of_study: profile.year_of_study,
    badge_tier: profile.badge_tier,
  };
}

function buildConnectionState(
  userId: string,
  incomingRequests: ConnectionRequestRow[],
  outgoingRequests: ConnectionRequestRow[],
  connections: ConnectionRow[],
  profiles: ProfileRow[],
): ConnectionStatePayload {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const connectedUserIds = connections.map((connection) =>
    connection.user_a_id === userId ? connection.user_b_id : connection.user_a_id,
  );
  const incomingRequesterIds = incomingRequests.map((request) => request.requester_id);
  const outgoingRequestRecipientIds = outgoingRequests.map(
    (request) => request.recipient_id,
  );

  return {
    connectedUserIds,
    incomingRequesterIds,
    outgoingRequestRecipientIds,
    incomingRequests: incomingRequests
      .map((request) => {
        const requesterProfile = profilesById.get(request.requester_id);

        if (!requesterProfile) {
          return null;
        }

        return {
          id: request.id,
          requester_id: request.requester_id,
          recipient_id: request.recipient_id,
          status: request.status,
          created_at: request.created_at,
          requester_profile: mapProfileToPreview(requesterProfile),
        };
      })
      .filter(
        (request): request is IncomingConnectionRequest => request !== null,
      ),
  };
}

export async function fetchConnectionState(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    { data: incomingRequests, error: incomingError },
    { data: outgoingRequests, error: outgoingError },
    { data: connectionsAsUserA, error: connectionsAError },
    { data: connectionsAsUserB, error: connectionsBError },
  ] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("*")
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("connection_requests")
      .select("*")
      .eq("requester_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("connections").select("*").eq("user_a_id", userId),
    supabase.from("connections").select("*").eq("user_b_id", userId),
  ]);

  if (incomingError) {
    throw new Error(incomingError.message);
  }

  if (outgoingError) {
    throw new Error(outgoingError.message);
  }

  if (connectionsAError) {
    throw new Error(connectionsAError.message);
  }

  if (connectionsBError) {
    throw new Error(connectionsBError.message);
  }

  const requesterIds = (incomingRequests ?? []).map((request) => request.requester_id);
  const { data: profiles, error: profilesError } =
    requesterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, major, year_of_study, badge_tier")
          .in("id", requesterIds)
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return buildConnectionState(
    userId,
    incomingRequests ?? [],
    outgoingRequests ?? [],
    [...(connectionsAsUserA ?? []), ...(connectionsAsUserB ?? [])],
    (profiles as ProfileRow[]) ?? [],
  );
}

export async function createConnectionRequest(recipientId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.rpc("create_connection_request", {
    recipient_id_input: recipientId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function respondToConnectionRequest(
  requestId: string,
  decision: "accepted" | "declined",
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.rpc("respond_to_connection_request", {
    request_id_input: requestId,
    decision_input: decision,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function buildRelationshipStatusMap(
  connectedUserIds: string[],
  incomingRequesterIds: string[],
  outgoingRequestRecipientIds: string[],
) {
  const statusMap = new Map<string, ConnectionRelationshipStatus>();

  for (const userId of connectedUserIds) {
    statusMap.set(userId, "connected");
  }

  for (const userId of incomingRequesterIds) {
    statusMap.set(userId, "incoming_request");
  }

  for (const userId of outgoingRequestRecipientIds) {
    if (!statusMap.has(userId)) {
      statusMap.set(userId, "outgoing_request");
    }
  }

  return statusMap;
}
