import { supabase } from "@lib/supabase";
import type { AppNotification } from "@appTypes/index";
import type { Database } from "@appTypes/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipient_id: row.recipient_id,
    actor_id: row.actor_id,
    group_id: row.group_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    metadata: row.metadata ?? {},
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

export async function fetchNotifications(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapNotification);
}

export async function markNotificationAsRead(notificationId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function respondToGroupInvitation(
  invitationId: string,
  decision: "accepted" | "declined",
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.rpc("respond_to_group_invitation", {
    invitation_id_input: invitationId,
    decision_input: decision,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function respondToGroupJoinRequest(
  requestId: string,
  decision: "accepted" | "declined",
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.rpc("respond_to_group_join_request", {
    request_id_input: requestId,
    decision_input: decision,
  });

  if (error) {
    throw new Error(error.message);
  }
}
