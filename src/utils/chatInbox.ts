import type {
  CommunityChatSummary,
  DirectConversationSummary,
  GroupChatSummary,
} from "@appTypes/index";

export type InboxItem = {
  id: string;
  kind: "direct" | "group" | "community";
  title: string;
  subtitle: string;
  preview: string;
  timestamp: string | null;
  sortTimestamp: string;
  unreadCount: number;
  avatarUri?: string | null;
  roundedAvatar?: boolean;
  targetUserId?: string;
  isArchived: boolean;
};

export function formatGroupTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function buildUnifiedInboxItems({
  conversations,
  groupChats,
  communityChats,
}: {
  conversations: DirectConversationSummary[];
  groupChats: GroupChatSummary[];
  communityChats: CommunityChatSummary[];
}) {
  const directItems: InboxItem[] = conversations.map((conversation) => ({
    id: conversation.id,
    kind: "direct",
    title: conversation.other_user.display_name,
    subtitle: "Direct message",
    preview: conversation.last_message_preview ?? "Start the conversation here.",
    timestamp: conversation.last_message_at,
    sortTimestamp: conversation.last_message_at ?? conversation.updated_at,
    unreadCount: conversation.unread_count,
    avatarUri: conversation.other_user.avatar_url,
    roundedAvatar: true,
    targetUserId: conversation.other_user.id,
    isArchived: conversation.archived_at !== null,
  }));

  const groupItems: InboxItem[] = groupChats.map((group) => ({
    id: group.id,
    kind: "group",
    title: group.name,
    subtitle:
      [group.module_code, formatGroupTypeLabel(group.type)]
        .filter(Boolean)
        .join(" · ") || "Group chat",
    preview: group.last_message_preview ?? "No messages yet. Start the group chat.",
    timestamp: group.last_message_at,
    sortTimestamp: group.last_message_at ?? group.created_at,
    unreadCount: group.unread_count,
    roundedAvatar: false,
    isArchived: group.archived_at !== null,
  }));

  const communityItems: InboxItem[] = communityChats.map((community) => ({
    id: community.id,
    kind: "community",
    title: community.name,
    subtitle: "Community chat",
    preview:
      community.last_message_preview ??
      "No messages yet. Start the community conversation.",
    timestamp: community.last_message_at,
    sortTimestamp: community.last_message_at ?? community.created_at,
    unreadCount: community.unread_count,
    roundedAvatar: false,
    isArchived: community.archived_at !== null,
  }));

  return [...directItems, ...groupItems, ...communityItems].sort(
    (left, right) =>
      new Date(right.sortTimestamp).getTime() -
      new Date(left.sortTimestamp).getTime(),
  );
}
