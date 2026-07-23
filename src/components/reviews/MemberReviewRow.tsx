import { Alert, StyleSheet, Text, View } from "react-native";

import { AppAvatar, GlassButton } from "@components/shared";
import { TierBadge, TierChip } from "@components/reviews/ReviewBadges";
import {
  getReviewEligibilityAlertCopy,
  getReviewRowErrorAlertCopy,
} from "@utils/reviewFlow";
import { useGroupReviewEligibility } from "@hooks/useGroupReviewEligibility";
import type { ReviewableGroupMember } from "@appTypes/index";

const ROLE_LABELS = {
  admin: "Admin",
  co_admin: "Co-admin",
  member: "Member",
} as const;

type Props = {
  groupId: string;
  member: ReviewableGroupMember;
  isLast?: boolean;
  onRate: (member: ReviewableGroupMember) => void;
  refreshToken?: number;
};

export function MemberReviewRow({
  groupId,
  member,
  isLast = false,
  onRate,
  refreshToken = 0,
}: Props) {
  const { data, reason, status } = useGroupReviewEligibility(groupId, member.id, {
    refreshToken,
  });
  const actionLabel = data?.alreadyReviewed ? "Update" : "Rate";

  function handleNotYetPress() {
    const copy = getReviewEligibilityAlertCopy(reason);
    Alert.alert(copy.title, copy.message);
  }

  function handleErrorPress() {
    const copy = getReviewRowErrorAlertCopy(reason);
    Alert.alert(copy.title, copy.message);
  }

  return (
    <View style={[styles.row, !isLast ? styles.divider : null]}>
      <View style={styles.avatarWrap}>
        <AppAvatar name={member.display_name} size={44} imageUri={member.avatar_url} />
        <View style={styles.chipOverlay}>
          <TierChip tier={member.badge_tier} size={18} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {member.display_name}
          </Text>
          <TierBadge tier={member.badge_tier} />
        </View>
        <Text style={styles.role}>
          {ROLE_LABELS[member.role] ?? member.role}
        </Text>
      </View>

      {status === "reviewed" ? (
        <View style={styles.reviewed}>
          <Text style={styles.reviewedCheck}>✓</Text>
          <Text style={styles.reviewedText}>Reviewed</Text>
        </View>
      ) : status === "notYet" ? (
        <GlassButton
          onPress={handleNotYetPress}
          radius={14}
          style={styles.notYetButton}
          variant="light"
        >
          <View style={styles.notYetInner}>
            <Text style={styles.notYetTitle}>Rate</Text>
            <Text numberOfLines={1} style={styles.notYetReason}>
              {reason || "Not yet eligible"}
            </Text>
          </View>
        </GlassButton>
      ) : status === "loading" ? (
        <GlassButton
          disabled
          label={actionLabel}
          radius={100}
          style={styles.rateButton}
          textStyle={styles.rateButtonLoadingText}
          variant="light"
        />
      ) : status === "error" ? (
        <GlassButton
          onPress={handleErrorPress}
          radius={14}
          style={styles.notYetButton}
          variant="light"
        >
          <View style={styles.notYetInner}>
            <Text style={styles.notYetTitle}>Unavailable</Text>
            <Text numberOfLines={1} style={styles.notYetReason}>
              {reason || "Could not load status"}
            </Text>
          </View>
        </GlassButton>
      ) : (
        <GlassButton
          label={actionLabel}
          onPress={() => onRate(member)}
          radius={100}
          style={styles.rateButton}
          variant="dark"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  divider: {
    borderBottomColor: "rgba(90,110,180,0.12)",
    borderBottomWidth: 1,
  },
  avatarWrap: {
    height: 44,
    width: 44,
  },
  chipOverlay: {
    borderColor: "#F4F5FA",
    borderRadius: 11,
    borderWidth: 2,
    bottom: -2,
    position: "absolute",
    right: -2,
  },
  content: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  name: {
    color: "#22222E",
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: "600",
  },
  role: {
    color: "#6E6E80",
    fontSize: 12,
  },
  rateButton: {
    minWidth: 74,
  },
  rateButtonLoadingText: {
    color: "#6E6E80",
  },
  notYetButton: {
    maxWidth: 122,
    paddingHorizontal: 0,
  },
  notYetInner: {
    alignItems: "flex-end",
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notYetTitle: {
    color: "#6E6E80",
    fontSize: 11,
    fontWeight: "600",
  },
  notYetReason: {
    color: "#8A8A9C",
    fontSize: 10,
  },
  reviewed: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 6,
  },
  reviewedCheck: {
    color: "#3FA36B",
    fontSize: 15,
    fontWeight: "700",
  },
  reviewedText: {
    color: "#7A7A8C",
    fontSize: 13,
    fontWeight: "600",
  },
});
