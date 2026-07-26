import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { AppAvatar, GlassButton, GlassSurface } from "@components/shared";
import { FlaggedVeil, RemovedTombstone } from "@components/moderation";
import { ReviewSummaryCluster } from "@components/reviews/ReviewSummaryCluster";
import type { PeopleMatch, ProfileReviewSummary } from "@appTypes/index";
import { getProfileReviewSummary } from "@services/reviewService";
import {
  useAuthStore,
  useConnectionsStore,
  useDirectMessagesStore,
  useMatchesStore,
} from "@store/index";

function toIntentLabel(intent: string) {
  switch (intent) {
    case "study_group":
      return "Study groups";
    case "hackathon":
      return "Hackathons / comps";
    case "tutoring":
      return "Tutoring";
    case "internship_networking":
      return "Internship networking";
    default:
      return intent;
  }
}

function subtitleFor(candidate: PeopleMatch) {
  return [
    candidate.major ?? candidate.faculty ?? "NUS student",
    candidate.year_of_study ? `Year ${candidate.year_of_study}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ModeratedProfileText({
  children,
  verdict,
  what,
  textStyle,
}: {
  children: string;
  verdict?: PeopleMatch["bio_moderation_outcome"];
  what: "Headline" | "Bio";
  textStyle: object;
}) {
  if (verdict === "blocked") {
    return <RemovedTombstone what={what} />;
  }

  if (verdict === "flagged") {
    return (
      <FlaggedVeil compact={what === "Headline"}>
        <Text style={textStyle}>{children}</Text>
      </FlaggedVeil>
    );
  }

  return <Text style={textStyle}>{children}</Text>;
}

export default function PeopleProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const session = useAuthStore((state) => state.session);
  const peopleMatches = useMatchesStore((state) => state.peopleMatches);
  const refreshPeopleMatches = useMatchesStore(
    (state) => state.refreshPeopleMatches,
  );
  const openConversationWithUser = useDirectMessagesStore(
    (state) => state.openConversationWithUser,
  );
  const sendConnectionRequest = useConnectionsStore(
    (state) => state.sendConnectionRequest,
  );
  const cancelConnectionRequest = useConnectionsStore(
    (state) => state.cancelConnectionRequest,
  );
  const connectedUserIds = useConnectionsStore((state) => state.connectedUserIds);
  const incomingRequesterIds = useConnectionsStore(
    (state) => state.incomingRequesterIds,
  );
  const outgoingRequestRecipientIds = useConnectionsStore(
    (state) => state.outgoingRequestRecipientIds,
  );

  const candidate = useMemo(
    () => peopleMatches.find((match) => match.user_id === userId) ?? null,
    [peopleMatches, userId],
  );
  const relationshipStatus = useMemo(() => {
    if (!candidate) {
      return "none";
    }

    if (connectedUserIds.includes(candidate.user_id)) {
      return "connected";
    }

    if (incomingRequesterIds.includes(candidate.user_id)) {
      return "incoming_request";
    }

    if (outgoingRequestRecipientIds.includes(candidate.user_id)) {
      return "outgoing_request";
    }

    return "none";
  }, [
    candidate,
    connectedUserIds,
    incomingRequesterIds,
    outgoingRequestRecipientIds,
  ]);
  const [summary, setSummary] = useState<ProfileReviewSummary | null>(null);

  useEffect(() => {
    if (!candidate && peopleMatches.length === 0) {
      void refreshPeopleMatches();
    }
  }, [candidate, peopleMatches.length, refreshPeopleMatches]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void getProfileReviewSummary(userId)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [userId]);

  async function handleConnect() {
    if (!session?.user.id || !candidate) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before connecting.",
      );
      return;
    }

    try {
      await sendConnectionRequest(candidate.user_id, session.user.id);
    } catch (error) {
      Alert.alert(
        "Could not send request",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function handleCancelRequest() {
    if (!session?.user.id || !candidate) {
      Alert.alert("Sign in required", "Please sign in again before cancelling.");
      return;
    }

    Alert.alert(
      "Cancel request?",
      `Withdraw your connection request to ${candidate.display_name}?`,
      [
        { text: "Keep request", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await cancelConnectionRequest(candidate.user_id, session.user.id);
              } catch (error) {
                Alert.alert(
                  "Could not cancel request",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  }

  async function handleMessage() {
    if (!session?.user.id || !candidate) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before opening chats.",
      );
      return;
    }

    try {
      const conversationId = await openConversationWithUser(
        candidate.user_id,
        session.user.id,
      );
      router.push(`/chats/${conversationId}` as never);
    } catch (error) {
      Alert.alert(
        "Could not open chat",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  if (!candidate) {
    return (
      <LinearGradient colors={APP_GRADIENT} style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <BackButton />
          <GlassSurface radius={24} intensity={35} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Profile unavailable</Text>
            <Text style={styles.emptyText}>
              Reopen People after matches refresh to view this profile.
            </Text>
          </GlassSurface>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const headline =
    candidate.headline?.trim() ||
    candidate.bio.trim() ||
    "No headline added yet.";
  const about = candidate.bio.trim() || "No bio added yet.";
  const canConnect = relationshipStatus === "none";
  const canMessage = relationshipStatus === "connected";
  const hasOutgoingRequest = relationshipStatus === "outgoing_request";
  const hasIncomingRequest = relationshipStatus === "incoming_request";
  const primaryActionLabel = hasOutgoingRequest
    ? "Requested"
    : hasIncomingRequest
      ? "Request received"
      : relationshipStatus === "connected"
        ? "Connected"
        : "Request";

  return (
    <LinearGradient colors={APP_GRADIENT} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <BackButton />

          <View style={styles.headerRow}>
            <AppAvatar
              name={candidate.display_name}
              imageUri={candidate.avatar_url}
              size={76}
            />
            <View style={styles.identityText}>
              <Text style={styles.name}>{candidate.display_name}</Text>
              <Text style={styles.subtitle}>{subtitleFor(candidate)}</Text>
              <ReviewSummaryCluster
                summary={summary}
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/profile/reviews",
                    params: { profileId: candidate.user_id },
                  } as never);
                }}
              />
            </View>
          </View>

          <ModeratedProfileText
            verdict={candidate.headline_moderation_outcome}
            what="Headline"
            textStyle={styles.headline}
          >
            {headline}
          </ModeratedProfileText>

          <View style={styles.actions}>
            <GlassButton
              disabled={!canConnect}
              label={primaryActionLabel}
              onPress={handleConnect}
              style={styles.actionButton}
              variant="dark"
            />
            {hasOutgoingRequest ? (
              <GlassButton
                label="Cancel request"
                onPress={handleCancelRequest}
                style={styles.actionButton}
                variant="light"
              />
            ) : canMessage ? (
              <GlassButton
                label="Message"
                onPress={handleMessage}
                style={styles.actionButton}
                variant="light"
              />
            ) : null}
          </View>

          <ProfileCard title="HERE FOR">
            <View style={styles.chipRow}>
              {(candidate.intents ?? []).map((intent) => (
                <View key={intent} style={styles.intentChip}>
                  <Text style={styles.intentChipText}>
                    {toIntentLabel(intent)}
                  </Text>
                </View>
              ))}
            </View>
          </ProfileCard>

          <ProfileCard title="ABOUT">
            <ModeratedProfileText
              verdict={candidate.bio_moderation_outcome}
              what="Bio"
              textStyle={styles.aboutText}
            >
              {about}
            </ModeratedProfileText>
          </ProfileCard>

          <ProfileCard
            title={`MODS THIS SEMESTER · ${candidate.shared_modules.length}`}
          >
            <ChipRow items={candidate.shared_modules} kind="module" />
          </ProfileCard>

          <ProfileCard title="SKILLS">
            <ChipRow
              items={candidate.skills}
              kind="plain"
              empty="No skills added yet."
            />
          </ProfileCard>

          <ProfileCard title="INTERESTS">
            <ChipRow
              items={candidate.interests}
              kind="plain"
              empty="No interests added yet."
            />
          </ProfileCard>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.back()}
      style={styles.backButton}
    >
      <Ionicons name="chevron-back" size={17} color="#3A4150" />
      <Text style={styles.backText}>People</Text>
    </Pressable>
  );
}

function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <GlassSurface radius={22} intensity={35} style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardContent}>{children}</View>
    </GlassSurface>
  );
}

function ChipRow({
  items,
  kind,
  empty,
}: {
  items: string[];
  kind: "module" | "plain";
  empty?: string;
}) {
  if (items.length === 0) {
    return (
      <Text style={styles.emptyText}>{empty ?? "Nothing added yet."}</Text>
    );
  }

  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <View
          key={item}
          style={kind === "module" ? styles.moduleChip : styles.plainChip}
        >
          <Text
            style={
              kind === "module" ? styles.moduleChipText : styles.plainChipText
            }
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 20,
    paddingBottom: 120,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 100,
    flexDirection: "row",
    gap: 5,
    paddingLeft: 11,
    paddingRight: 15,
    paddingVertical: 9,
  },
  backText: {
    color: "#3A4150",
    fontSize: 14,
    fontWeight: "600",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  identityText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    color: "#1A1A24",
    fontSize: 23,
    fontWeight: "700",
  },
  subtitle: {
    color: "#6E7280",
    fontSize: 14,
  },
  headline: {
    color: "#3A4150",
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  card: {
    padding: 18,
  },
  cardTitle: {
    color: "#7C8290",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  cardContent: {
    marginTop: 10,
  },
  aboutText: {
    color: "#42474F",
    fontSize: 14,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intentChip: {
    backgroundColor: "#5B4FA6",
    borderRadius: 100,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  intentChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  moduleChip: {
    backgroundColor: "#E6ECFA",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  moduleChipText: {
    color: "#3F5BA9",
    fontSize: 13,
    fontWeight: "600",
  },
  plainChip: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "#DADAE2",
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  plainChipText: {
    color: "#4B4B57",
    fontSize: 13,
    fontWeight: "500",
  },
  emptyCard: {
    marginTop: 18,
    padding: 18,
  },
  emptyTitle: {
    color: "#1A1A24",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    color: "#5B6472",
    fontSize: 14,
    lineHeight: 21,
  },
});
