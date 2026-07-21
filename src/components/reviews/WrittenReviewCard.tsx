import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@components/shared";
import type { PublicProfileReview } from "@appTypes/index";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRelativeTime(isoDate: string) {
  const now = new Date("2026-07-21T12:00:00+08:00").getTime();
  const then = new Date(isoDate).getTime();
  const dayDiff = Math.max(0, Math.round((now - then) / 86400000));

  if (dayDiff < 1) {
    return "today";
  }

  if (dayDiff < 7) {
    return `${dayDiff}d ago`;
  }

  if (dayDiff < 30) {
    return `${Math.round(dayDiff / 7)}w ago`;
  }

  return `${Math.round(dayDiff / 30)}mo ago`;
}

export function WrittenReviewCard({ review }: { review: PublicProfileReview }) {
  return (
    <GlassSurface tint="light" radius={20} intensity={35} style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.header}>
          {review.reviewer_avatar_url ? (
            <Image source={{ uri: review.reviewer_avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={["#8A94C8", "#5A63A8"]} style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {getInitials(review.reviewer_display_name)}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.headerText}>
            <Text style={styles.reviewerName}>{review.reviewer_display_name}</Text>
            <Text style={styles.reviewTime}>{formatRelativeTime(review.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.body}>{review.written_review}</Text>

        <View style={styles.groupChip}>
          <Ionicons name="people-outline" size={13} color="#6E6E80" />
          <Text style={styles.groupChipText}>from {review.group_name}</Text>
        </View>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  inner: {
    gap: 11,
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewerName: {
    color: "#22222E",
    fontSize: 14.5,
    fontWeight: "600",
  },
  reviewTime: {
    color: "#75758A",
    fontSize: 12,
  },
  body: {
    color: "#40404F",
    fontSize: 14,
    lineHeight: 21.5,
  },
  groupChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDEDF2",
    borderRadius: 100,
    flexDirection: "row",
    gap: 6,
    paddingLeft: 9,
    paddingRight: 11,
    paddingVertical: 5,
  },
  groupChipText: {
    color: "#5C5C70",
    fontSize: 12,
    fontWeight: "600",
  },
});
