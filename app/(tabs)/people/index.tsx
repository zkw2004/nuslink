import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import {
  AppAvatar,
  AppButton,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  SectionCard,
} from "@components/shared";
import ProfileCard, {
  type MatchSignal,
  type ProfileCardData,
} from "@features/matching/ProfileCard";
import type { PeopleMatch } from "@appTypes/index";
import { logMatchFeedbackEvent } from "@services/matchingService";
import {
  useAuthStore,
  useConnectionsStore,
  useDirectMessagesStore,
  useMatchesStore,
} from "@store/index";

function toBadgeTierLabel(tier: "bronze" | "silver" | "gold" | null) {
  switch (tier) {
    case "gold":
      return "Standout" as const;
    case "silver":
      return "Trusted" as const;
    case "bronze":
      return "Reliable" as const;
    default:
      return null;
  }
}

function toIntentText(intents: string[]) {
  const primaryIntent = intents[0];

  switch (primaryIntent) {
    case "study_group":
      return "Looking for a study group";
    case "hackathon":
      return "Looking for a hackathon teammate";
    case "tutoring":
      return "Looking for tutoring connections";
    case "internship_networking":
      return "Looking for internship networking";
    default:
      return "Open to connecting";
  }
}

function toMetaSignal(reason: string): MatchSignal {
  const normalized = reason.toLowerCase();

  if (
    normalized.includes("same major") ||
    normalized.includes("same faculty") ||
    normalized.includes("year-of-study") ||
    normalized.includes("year of study")
  ) {
    return { icon: "🎓", text: "Academic fit" };
  }

  const sharedModuleCountMatch = normalized.match(
    /share (\d+) current-semester modules/,
  );
  if (sharedModuleCountMatch) {
    const count = sharedModuleCountMatch[1];
    return {
      icon: "📚",
      text: count === "1" ? "Common mod" : `${count} common mods`,
    };
  }

  const sharedSingleModuleMatch = reason.match(/^Share\s+([A-Z0-9]+)\s+this semester\.?$/i);
  if (sharedSingleModuleMatch) {
    return { icon: "📚", text: "Common mod" };
  }

  if (normalized.includes("module") || normalized.includes("semester")) {
    return { icon: "📚", text: "Common mods" };
  }

  if (normalized.includes("timetable") || normalized.includes("availability")) {
    return { icon: "⏰", text: "Similar schedule" };
  }

  if (
    normalized.includes("same kind of collaboration") ||
    normalized.includes("same goal") ||
    normalized.includes("here for")
  ) {
    return { icon: "🎯", text: "Shared goals" };
  }

  if (normalized.includes("skills") || normalized.includes("strengths")) {
    return { icon: "🛠️", text: "Similar skills" };
  }

  if (normalized.includes("hall") || normalized.includes("residence")) {
    return { icon: "🏠", text: "Shared residence" };
  }

  const mutualConnectionCountMatch = normalized.match(/^(\d+)\s+mutual connections?$/);
  if (mutualConnectionCountMatch) {
    const count = mutualConnectionCountMatch[1];
    return {
      icon: "🤝",
      text: count === "1" ? "1 mutual" : `${count} mutuals`,
    };
  }

  if (normalized.includes("mutual connection")) {
    return { icon: "🤝", text: "Mutuals" };
  }

  if (normalized.includes("study mode")) {
    return { icon: "💬", text: "Similar study mode" };
  }

  if (normalized.includes("cca")) {
    return { icon: "🏃", text: "Shared CCA" };
  }

  if (normalized.includes("group size")) {
    return { icon: "👥", text: "Similar group size" };
  }

  if (normalized.includes("interest")) {
    return { icon: "✨", text: "Similar interests" };
  }

  return { icon: "🎯", text: "Good match" };
}

function isAcademicSignal(reason: string) {
  const normalized = reason.toLowerCase();

  return (
    normalized.includes("same major") ||
    normalized.includes("same faculty") ||
    normalized.includes("year-of-study") ||
    normalized.includes("year of study") ||
    normalized.includes("academic context")
  );
}

function dedupeSignals(signals: string[]) {
  const seen = new Set<string>();

  return signals.filter((signal) => {
    const normalized = signal.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function selectZoneFiveSignals(candidate: PeopleMatch) {
  const prioritizedSignals = dedupeSignals(candidate.top_signals ?? []);
  const fallbackSignals = dedupeSignals(candidate.match_reasons ?? []);
  const combinedSignals = dedupeSignals([...prioritizedSignals, ...fallbackSignals]);
  const nonAcademicSignals = combinedSignals.filter(
    (signal) => !isAcademicSignal(signal),
  );
  const academicSignals = combinedSignals.filter((signal) => isAcademicSignal(signal));

  return [...nonAcademicSignals, ...academicSignals].slice(0, 3).map(toMetaSignal);
}

function toProfileCardData(candidate: PeopleMatch): ProfileCardData {
  return {
    name: candidate.display_name,
    avatar: candidate.avatar_url
      ? { uri: candidate.avatar_url }
      : { uri: "https://placehold.co/88x88" },
    degree: candidate.major ?? candidate.faculty ?? "NUS student",
    year: candidate.year_of_study ? `Year ${candidate.year_of_study}` : "",
    hall: candidate.hall_residence ?? "",
    isActive: false,
    activityLabel: "",
    matchPct: candidate.compatibility_percentage,
    intentText: toIntentText(candidate.intents ?? []),
    bio: candidate.bio.trim() || "No bio added yet.",
    modules: candidate.shared_modules ?? [],
    skills: candidate.skills ?? [],
    metaSignals: selectZoneFiveSignals(candidate),
  };
}

export default function PeopleScreen() {
  const session = useAuthStore((state) => state.session);
  const peopleMatches = useMatchesStore((state) => state.peopleMatches);
  const availableModules = useMatchesStore((state) => state.availableModules);
  const semester = useMatchesStore((state) => state.semester);
  const isLoading = useMatchesStore((state) => state.isLoading);
  const error = useMatchesStore((state) => state.error);
  const refreshPeopleMatches = useMatchesStore((state) => state.refreshPeopleMatches);
  const openConversationWithUser = useDirectMessagesStore(
    (state) => state.openConversationWithUser,
  );
  const incomingRequests = useConnectionsStore((state) => state.incomingRequests);
  const connectionError = useConnectionsStore((state) => state.error);
  const refreshConnections = useConnectionsStore((state) => state.refreshConnections);
  const sendConnectionRequest = useConnectionsStore(
    (state) => state.sendConnectionRequest,
  );
  const handleConnectionRequest = useConnectionsStore(
    (state) => state.handleConnectionRequest,
  );
  const getRelationshipStatus = useConnectionsStore(
    (state) => state.getRelationshipStatus,
  );

  const [query, setQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string>("all");
  const [skippedUserIds, setSkippedUserIds] = useState<string[]>([]);
  const loggedViewKeys = useRef(new Set<string>());

  const normalizedMatches = useMemo(() => {
    return peopleMatches.map((candidate) => ({
      ...candidate,
      bio: candidate.bio ?? "",
      hall_residence: candidate.hall_residence ?? null,
      shared_modules: candidate.shared_modules ?? [],
      interests: candidate.interests ?? [],
      skills: candidate.skills ?? [],
      intents: candidate.intents ?? [],
      top_signals: candidate.top_signals ?? [],
      match_reasons: candidate.match_reasons ?? [],
      schedule_summary: candidate.schedule_summary ?? "No timetable overlap summary yet.",
      breakdown: {
        same_intent: candidate.breakdown?.same_intent ?? null,
        module_overlap: candidate.breakdown?.module_overlap ?? null,
        shared_skills: candidate.breakdown?.shared_skills ?? null,
        schedule_overlap: candidate.breakdown?.schedule_overlap ?? null,
        same_major: candidate.breakdown?.same_major ?? null,
        year_proximity: candidate.breakdown?.year_proximity ?? null,
        same_faculty: candidate.breakdown?.same_faculty ?? null,
        same_hall_or_residence:
          candidate.breakdown?.same_hall_or_residence ?? null,
        interest_overlap: candidate.breakdown?.interest_overlap ?? null,
        study_mode: candidate.breakdown?.study_mode ?? null,
        preferred_group_size: candidate.breakdown?.preferred_group_size ?? null,
        cca_tag_overlap: candidate.breakdown?.cca_tag_overlap ?? null,
        mutual_connections: candidate.breakdown?.mutual_connections ?? null,
      },
      compatibility_percentage: Math.max(
        0,
        Math.min(100, candidate.compatibility_percentage ?? 0),
      ),
    }));
  }, [peopleMatches]);

  useEffect(() => {
    void refreshPeopleMatches(activeModule === "all" ? undefined : activeModule);
  }, [activeModule, refreshPeopleMatches]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void refreshConnections(session.user.id);
  }, [refreshConnections, session?.user.id]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredMatches = useMemo(() => {
    const visibleMatches = normalizedMatches.filter(
      (candidate) => !skippedUserIds.includes(candidate.user_id),
    );
    const matchingCandidates = !normalizedQuery
      ? visibleMatches
      : visibleMatches.filter((candidate) => {
          return (
            candidate.display_name.toLowerCase().includes(normalizedQuery) ||
            candidate.major?.toLowerCase().includes(normalizedQuery) ||
            candidate.faculty?.toLowerCase().includes(normalizedQuery) ||
            candidate.shared_modules.some((moduleCode) =>
              moduleCode.toLowerCase().includes(normalizedQuery),
            )
          );
        });
    const unconnectedCandidates = matchingCandidates.filter(
      (candidate) => getRelationshipStatus(candidate.user_id) !== "connected",
    );
    const connectedCandidates = matchingCandidates.filter(
      (candidate) => getRelationshipStatus(candidate.user_id) === "connected",
    );

    return [...unconnectedCandidates, ...connectedCandidates];
  }, [getRelationshipStatus, normalizedMatches, normalizedQuery, skippedUserIds]);
  const incomingRequestByRequesterId = useMemo(
    () =>
      new Map(
        incomingRequests.map((request) => [request.requester_id, request] as const),
      ),
    [incomingRequests],
  );

  function logFeedbackEvent(
    candidate: PeopleMatch,
    eventType: "view" | "skip" | "accept",
  ) {
    void logMatchFeedbackEvent({
      target_user_id: candidate.user_id,
      event_type: eventType,
      semester,
      module_code: activeModule === "all" ? null : activeModule,
      compatibility_percentage: candidate.compatibility_percentage,
      top_signals: candidate.top_signals ?? [],
      shared_modules: candidate.shared_modules ?? [],
      metadata: {
        source: "people_card",
        active_module: activeModule,
      },
    }).catch(() => {
      // Feedback logging should never block the main People flow.
    });
  }

  useEffect(() => {
    for (const candidate of filteredMatches) {
      const viewKey = `${semester ?? "unknown"}:${activeModule}:${candidate.user_id}`;

      if (loggedViewKeys.current.has(viewKey)) {
        continue;
      }

      loggedViewKeys.current.add(viewKey);
      logFeedbackEvent(candidate, "view");
    }
  }, [activeModule, filteredMatches, semester]);

  async function handleSendRequest(candidate: PeopleMatch) {
    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before sending a connection request.",
      );
      return;
    }

    try {
      await sendConnectionRequest(candidate.user_id, session.user.id);
      logFeedbackEvent(candidate, "accept");
    } catch (requestError) {
      Alert.alert(
        "Could not send request",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    }
  }

  async function handleMessageConnectedCandidate(candidate: PeopleMatch) {
    if (!session?.user.id) {
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
      void logMatchFeedbackEvent({
        target_user_id: candidate.user_id,
        event_type: "chat_start",
        semester,
        module_code: activeModule === "all" ? null : activeModule,
        compatibility_percentage: candidate.compatibility_percentage,
        top_signals: candidate.top_signals ?? [],
        shared_modules: candidate.shared_modules ?? [],
        metadata: {
          source: "people_card_connected_message",
          active_module: activeModule,
          conversation_id: conversationId,
        },
      }).catch(() => {
        // Feedback logging should never block opening a direct message.
      });
      router.push(`/chats/${conversationId}` as never);
    } catch (openError) {
      Alert.alert(
        "Could not open chat",
        openError instanceof Error ? openError.message : "Please try again.",
      );
    }
  }

  function handleSkipCandidate(candidate: PeopleMatch) {
    setSkippedUserIds((current) =>
      current.includes(candidate.user_id) ? current : [...current, candidate.user_id],
    );
    logFeedbackEvent(candidate, "skip");
  }

  async function handleIncomingRequest(
    requestId: string,
    decision: "accepted" | "declined",
  ) {
    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before responding to a connection request.",
      );
      return;
    }

    try {
      await handleConnectionRequest(requestId, decision, session.user.id);
    } catch (requestError) {
      Alert.alert(
        "Could not update request",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    }
  }

  return (
    <LinearGradient
      colors={["#F6F8FD", "#E7EBF7", "#C6D0E8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <AppScreenHeader
        title="People"
        subtitle="Discover module-mates for the current semester, ranked by shared modules, academic alignment, availability, and profile fit."
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people, majors, or module codes"
            placeholderTextColor="#9AA0AB"
            className="rounded-[14px] border border-[#E4E9F1] bg-[#F9FBFD] px-4 py-4 text-[15px] text-[#0F1115]"
          />

          <Text className="mt-4 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
            {semester ? `${semester} people matches` : "People matches"}
          </Text>
          <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
            Send connection requests here first. Direct messages can open later once both users are mutually connected.
          </Text>
        </SectionCard>

        {connectionError ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              Connection requests are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">
              {connectionError}
            </Text>
          </SectionCard>
        ) : null}

        {incomingRequests.length > 0 ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Incoming requests
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Accept connections here before opening direct messages in a later Milestone 2 slice.
            </Text>

            <View className="mt-4 gap-3">
              {incomingRequests.map((request) => (
                <View
                  key={request.id}
                  className="rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <AppAvatar
                      name={request.requester_profile.display_name}
                      imageUri={request.requester_profile.avatar_url}
                      size={46}
                    />
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-[15px] font-bold text-[#0F1115]">
                          {request.requester_profile.display_name}
                        </Text>
                        {toBadgeTierLabel(request.requester_profile.badge_tier) ? (
                          <BadgeTierPill
                            tier={toBadgeTierLabel(request.requester_profile.badge_tier)!}
                          />
                        ) : null}
                      </View>
                      <Text className="mt-1 text-[13px] text-[#5C6370]">
                        {[
                          request.requester_profile.major,
                          request.requester_profile.year_of_study
                            ? `Year ${request.requester_profile.year_of_study}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Profile details available in People"}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1">
                      <AppButton
                        label="Accept"
                        onPress={() => {
                          void handleIncomingRequest(request.id, "accepted");
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <AppButton
                        label="Decline"
                        variant="secondary"
                        onPress={() => {
                          void handleIncomingRequest(request.id, "declined");
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <View className="mb-4 flex-row flex-wrap gap-2">
          <Pressable onPress={() => setActiveModule("all")}>
            <AppChip
              label="All modules"
              variant={activeModule === "all" ? "solid" : "default"}
            />
          </Pressable>
          {availableModules.map((moduleCode) => (
            <Pressable key={moduleCode} onPress={() => setActiveModule(moduleCode)}>
              <AppChip
                label={moduleCode}
                variant={activeModule === moduleCode ? "solid" : "module"}
              />
            </Pressable>
          ))}
        </View>

        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-[15px] font-semibold text-[#0F1115]">
              People matches are not available yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {!error && availableModules.length === 0 && !isLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              Add your current modules first
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              The People tab only matches students who share at least one current-semester module with you.
            </Text>
          </SectionCard>
        ) : null}

        {!error && availableModules.length > 0 && filteredMatches.length === 0 && !isLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              {normalizedQuery ? "No people match your search" : "No live matches yet"}
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              {normalizedQuery
                ? "Try a shorter name, a major, or one of your module codes."
                : "This can happen if no module-mates have completed onboarding yet for your current-semester modules."}
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-4">
          {filteredMatches.map((candidate) => {
            const relationshipStatus = getRelationshipStatus(candidate.user_id);
            const incomingRequest = incomingRequestByRequesterId.get(candidate.user_id);

            return (
              <ProfileCard
                key={candidate.user_id}
                data={toProfileCardData(candidate)}
                primaryActionLabel={
                  relationshipStatus === "connected"
                    ? "Connected"
                    : relationshipStatus === "incoming_request"
                      ? "Accept"
                    : relationshipStatus === "outgoing_request"
                      ? "Requested"
                      : "Connect"
                }
                primaryActionVariant={
                  relationshipStatus === "none" ||
                  relationshipStatus === "incoming_request"
                    ? "filled"
                    : "passive"
                }
                secondaryActionLabel={
                  relationshipStatus === "connected"
                    ? "Message"
                    : relationshipStatus === "incoming_request"
                      ? "Decline"
                    : relationshipStatus === "none"
                      ? "Skip"
                      : undefined
                }
                secondaryActionIcon={
                  relationshipStatus === "connected"
                    ? "message.fill"
                    : undefined
                }
                onConnect={() => {
                  if (relationshipStatus === "none") {
                    void handleSendRequest(candidate);
                    return;
                  }

                  if (relationshipStatus === "incoming_request" && incomingRequest) {
                    void handleIncomingRequest(incomingRequest.id, "accepted");
                  }
                }}
                onSecondaryAction={() => {
                  if (relationshipStatus === "connected") {
                    void handleMessageConnectedCandidate(candidate);
                    return;
                  }

                  if (relationshipStatus === "none") {
                    handleSkipCandidate(candidate);
                    return;
                  }

                  if (relationshipStatus === "incoming_request" && incomingRequest) {
                    void handleIncomingRequest(incomingRequest.id, "declined");
                  }
                }}
                onViewProfile={() => {
                  Alert.alert(
                    candidate.display_name,
                    "Full profile drill-down can be added in the next People-card slice.",
                  );
                }}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
