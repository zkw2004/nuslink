import type { PrivacySetting } from "@appTypes/index";

type DiscoverGroupAccessInput = {
  creator_id: string;
  privacy: PrivacySetting;
  joined: boolean;
  can_join: boolean;
  request_pending: boolean;
};

export type DiscoverGroupAccess = {
  isOwner: boolean;
  actionLabel: "Joined" | "Requested" | "Request to join" | "Locked" | "Join group";
  canRequestPrivateGroup: boolean;
  canJoinVisibleGroup: boolean;
  isActionDisabled: boolean;
};

export function getDiscoverGroupAccess(
  group: DiscoverGroupAccessInput,
  currentUserId: string | null | undefined,
): DiscoverGroupAccess {
  const isOwner = currentUserId === group.creator_id;
  const canRequestPrivateGroup =
    group.privacy === "private" &&
    !group.joined &&
    !isOwner &&
    !group.request_pending;
  const canJoinVisibleGroup = group.can_join && !group.joined && !isOwner;
  const actionLabel = getActionLabel(group);

  return {
    isOwner,
    actionLabel,
    canRequestPrivateGroup,
    canJoinVisibleGroup,
    isActionDisabled:
      group.privacy === "private"
        ? !canRequestPrivateGroup
        : !canJoinVisibleGroup,
  };
}

function getActionLabel(
  group: DiscoverGroupAccessInput,
): DiscoverGroupAccess["actionLabel"] {
  if (group.joined) {
    return "Joined";
  }

  if (group.privacy === "private" && group.request_pending) {
    return "Requested";
  }

  if (group.privacy === "private") {
    return "Request to join";
  }

  if (group.privacy === "semi_private" && !group.can_join) {
    return "Locked";
  }

  return "Join group";
}
