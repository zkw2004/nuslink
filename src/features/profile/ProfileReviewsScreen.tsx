import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WrittenReviewCard } from "@components/reviews/WrittenReviewCard";
import { GlassButton } from "@components/shared";
import { tierMeta } from "@lib/badges";
import {
  getProfileReviewSummary,
  listProfileReviews,
} from "@services/reviewService";
import type { ProfileReviewSummary, PublicProfileReview } from "@appTypes/index";

const PAGE_SIZE = 20;

type Props = {
  profileId: string;
  isSelf?: boolean;
  onBack: () => void;
};

export function ProfileReviewsScreen({
  profileId,
  isSelf = true,
  onBack,
}: Props) {
  const [summary, setSummary] = useState<ProfileReviewSummary | null>(null);
  const [reviews, setReviews] = useState<PublicProfileReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadInitial() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextSummary, firstPage] = await Promise.all([
          getProfileReviewSummary(profileId),
          listProfileReviews(profileId, PAGE_SIZE, 0),
        ]);

        if (!isActive) {
          return;
        }

        setSummary(nextSummary);
        setReviews(firstPage);
        setIsDone(firstPage.length < PAGE_SIZE);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load reviews right now.",
        );
        setSummary(null);
        setReviews([]);
        setIsDone(true);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      isActive = false;
    };
  }, [profileId]);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || isDone) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = await listProfileReviews(profileId, PAGE_SIZE, reviews.length);
      setReviews((current) => [...current, ...nextPage]);
      setIsDone(nextPage.length < PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isDone, isLoading, isLoadingMore, profileId, reviews.length]);

  const meta = tierMeta(summary?.badge_tier ?? null);
  const reviewCount = summary?.received_review_count ?? 0;
  const hasReviews = reviewCount > 0 && reviews.length > 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <GlassButton
            onPress={onBack}
            style={styles.backButton}
            variant="light"
          >
            <View style={styles.backInner}>
              <Ionicons name="chevron-back" size={16} color="#33333F" />
              <Text style={styles.backText}>Back</Text>
            </View>
          </GlassButton>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#5646B0" style={styles.loading} />
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load reviews</Text>
            <Text style={styles.stateBody}>{errorMessage}</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={hasReviews ? reviews : []}
            keyExtractor={(item) => item.id}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator color="#5646B0" style={styles.footerLoading} />
              ) : null
            }
          ListHeaderComponent={
              hasReviews ? (
                <View style={styles.listHeaderOnly}>
                  <Text style={styles.listLabel}>
                    {isSelf ? "YOUR REVIEWS" : "WRITTEN REVIEWS"}
                  </Text>
                </View>
              ) : (
                <View style={styles.header}>
                  <View style={[styles.medallion, { shadowColor: meta.ink }]}>
                    <LinearGradient colors={meta.gradient} style={styles.medallionInner}>
                      <Ionicons name="star" size={40} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <Text style={[styles.tierLabel, { color: meta.ink }]}>
                    {meta.label}
                  </Text>
                  <Text style={styles.emptyLine}>
                    {isSelf
                      ? "You have no reviews yet. They will show up here once groupmates review your collaboration."
                      : "No reviews yet."}
                  </Text>
                </View>
              )
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => <WrittenReviewCard review={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#E7EBF7",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButton: {
    borderRadius: 100,
    paddingLeft: 11,
    paddingRight: 15,
    paddingVertical: 9,
  },
  backInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  backText: {
    color: "#33333F",
    fontSize: 14,
    fontWeight: "600",
  },
  loading: {
    marginTop: 60,
  },
  stateCard: {
    alignItems: "center",
    marginTop: 56,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: "#33333F",
    fontSize: 18,
    fontWeight: "700",
  },
  stateBody: {
    color: "#6E6E80",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 300,
    textAlign: "center",
  },
  list: {
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  header: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 6,
    paddingTop: 4,
  },
  listHeaderOnly: {
    paddingBottom: 6,
    paddingTop: 4,
  },
  medallion: {
    borderRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
  },
  medallionInner: {
    alignItems: "center",
    borderRadius: 26,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  tierLabel: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyLine: {
    color: "#6E6E80",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 270,
    textAlign: "center",
  },
  listLabel: {
    color: "#7A7A8C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 6,
    width: "100%",
  },
  footerLoading: {
    marginVertical: 16,
  },
});
