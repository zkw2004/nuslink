import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TierBadge, StarRow } from "@components/reviews/ReviewBadges";
import type { ProfileReviewSummary } from "@appTypes/index";

type Props = {
  summary: ProfileReviewSummary | null;
  onPress: () => void;
};

export function ReviewSummaryCluster({ summary, onPress }: Props) {
  const count = summary?.received_review_count ?? 0;
  const hasReviews = count > 0;

  return (
    <Pressable
      accessibilityLabel={
        hasReviews ? `Reputation, ${count} reviews` : "Reputation, no reviews yet"
      }
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View style={[styles.cluster, pressed ? styles.pressed : null]}>
          <TierBadge tier={summary?.badge_tier ?? null} />
          {hasReviews ? (
            <>
              <StarRow average={summary?.overall_average ?? 0} />
              <Text style={styles.count}>
                {count === 1 ? "1 review" : `${count} reviews`}
              </Text>
            </>
          ) : (
            <Text style={styles.empty}>No reviews yet</Text>
          )}
          <Ionicons
            color="#9A9AAA"
            name="chevron-forward"
            size={16}
            style={styles.chevron}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    minHeight: 34,
    paddingRight: 4,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  count: {
    color: "#6E6E80",
    fontSize: 12,
  },
  empty: {
    color: "#75758A",
    fontSize: 12,
  },
  chevron: {
    marginLeft: -1,
  },
});
