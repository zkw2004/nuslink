import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppAvatar,
  AppButton,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  CompatibilityBadge,
  SectionCard,
} from "@components/shared";
import { useAuthStore, useConnectionsStore, useMatchesStore } from "@store/index";

function toBadgeTierLabel(tier: "bronze" | "silver" | "gold" | null) {
  switch (tier) {
    case "gold":
      return "Standout" as const;
    case "silver":
      return "Trusted" as const;
    case "bronze":
      return "Reliable" as const;
    default:
      return "New" as const;
  }
}

export default function PeopleScreen() {
  const session = useAuthStore((state) => state.session);
  const peopleMatches = useMatchesStore((state) => state.peopleMatches);
  const availableModules = useMatchesStore((state) => state.availableModules);
  const semester = useMatchesStore((state) => state.semester);
  const isLoading = useMatchesStore((state) => state.isLoading);
  const error = useMatchesStore((state) => state.error);
  const refreshPeopleMatches = useMatchesStore((state) => state.refreshPeopleMatches);
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
    if (!normalizedQuery) {
      return peopleMatches;
    }

    return peopleMatches.filter((candidate) => {
      return (
        candidate.display_name.toLowerCase().includes(normalizedQuery) ||
        candidate.major?.toLowerCase().includes(normalizedQuery) ||
        candidate.faculty?.toLowerCase().includes(normalizedQuery) ||
        candidate.shared_modules.some((moduleCode) =>
          moduleCode.toLowerCase().includes(normalizedQuery),
        )
      );
    });
  }, [normalizedQuery, peopleMatches]);

  async function handleSendRequest(recipientId: string) {
    if (!session?.user.id) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before sending a connection request.",
      );
      return;
    }

    try {
      await sendConnectionRequest(recipientId, session.user.id);
    } catch (requestError) {
      Alert.alert(
        "Could not send request",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    }
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

  function renderConnectionAction(candidateUserId: string) {
    const relationshipStatus = getRelationshipStatus(candidateUserId);

    if (relationshipStatus === "connected") {
      return <AppChip label="Connected" variant="solid" />;
    }

    if (relationshipStatus === "outgoing_request") {
      return <AppChip label="Requested" variant="outline" />;
    }

    if (relationshipStatus === "incoming_request") {
      return <AppChip label="Respond above" variant="outline" />;
    }

    return (
      <AppButton
        label="Connect"
        variant="secondary"
        onPress={() => {
          void handleSendRequest(candidateUserId);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
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
                        <BadgeTierPill
                          tier={toBadgeTierLabel(request.requester_profile.badge_tier)}
                        />
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
          {filteredMatches.map((candidate) => (
            <SectionCard key={candidate.user_id}>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 flex-row gap-3">
                  <AppAvatar
                    name={candidate.display_name}
                    imageUri={candidate.avatar_url}
                    size={54}
                  />
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-[17px] font-bold text-[#0F1115]">
                        {candidate.display_name}
                      </Text>
                      <BadgeTierPill tier={toBadgeTierLabel(candidate.badge_tier)} />
                    </View>
                    <Text className="mt-1 text-[13px] text-[#5C6370]">
                      {[candidate.major, candidate.year_of_study ? `Year ${candidate.year_of_study}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>
                <CompatibilityBadge score={candidate.compatibility_percentage} />
              </View>

              <Text className="mt-4 text-[14px] leading-6 text-[#303744]">
                {candidate.bio.trim() || "No bio added yet."}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {candidate.shared_modules.map((moduleCode) => (
                  <AppChip key={`${candidate.user_id}-${moduleCode}`} label={moduleCode} variant="module" />
                ))}
              </View>

              {candidate.match_reasons.length > 0 ? (
                <View className="mt-4 gap-2 rounded-[16px] border border-[#E4E9F1] bg-white p-3">
                  <Text className="text-[13px] font-semibold text-[#0F1115]">
                    Why this match
                  </Text>
                  {candidate.match_reasons.map((reason) => (
                    <Text
                      key={`${candidate.user_id}-${reason}`}
                      className="text-[13px] leading-5 text-[#5C6370]"
                    >
                      {`\u2022 ${reason}`}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View className="mt-4 items-start">
                {renderConnectionAction(candidate.user_id)}
              </View>

              <View className="mt-4 gap-3 rounded-[16px] bg-[#F7F9FC] p-3">
                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Shared modules
                  {candidate.breakdown.module_overlap !== null
                    ? ` · ${candidate.breakdown.module_overlap}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.shared_modules.length === 1
                    ? `You are both taking ${candidate.shared_modules[0]} this semester.`
                    : `You share ${candidate.shared_modules.length} current-semester modules, which strongly boosts compatibility.`}
                </Text>

                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Target grade
                  {candidate.breakdown.target_grade !== null
                    ? ` · ${candidate.breakdown.target_grade}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.target_grade_summary}
                </Text>

                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Schedule overlap
                  {candidate.breakdown.schedule_overlap !== null
                    ? ` · ${candidate.breakdown.schedule_overlap}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.schedule_summary}
                </Text>

                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Faculty / major
                  {candidate.breakdown.faculty_major !== null
                    ? ` · ${candidate.breakdown.faculty_major}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.breakdown.faculty_major === null
                    ? "Add faculty and major details on both profiles to compare academic background."
                    : candidate.breakdown.faculty_major >= 100
                      ? "You share the same major, so your academic context is very closely aligned."
                      : candidate.breakdown.faculty_major >= 65
                        ? "You are from the same faculty, which may make your academic context more similar."
                        : "Your match comes from other signals more than faculty or major."}
                </Text>

                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Year proximity
                  {candidate.breakdown.year_proximity !== null
                    ? ` · ${candidate.breakdown.year_proximity}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.breakdown.year_proximity === null
                    ? "Add year-of-study data on both profiles to compare progression."
                    : candidate.breakdown.year_proximity >= 70
                      ? "You are close in year of study, which usually means similar pacing and module pathways."
                      : candidate.breakdown.year_proximity >= 40
                        ? "There is some academic overlap even though you are not in the exact same year."
                        : "This match is driven more by module and profile similarity than by year of study."}
                </Text>

                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Interest overlap
                  {candidate.breakdown.interest_overlap !== null
                    ? ` · ${candidate.breakdown.interest_overlap}%`
                    : ""}
                </Text>
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {candidate.breakdown.interest_overlap === null
                    ? "Add interests on both profiles to compare academic themes."
                    : candidate.breakdown.interest_overlap >= 50
                      ? "Your listed interests overlap strongly."
                      : candidate.breakdown.interest_overlap > 0
                        ? "You share some common interests, though this is not the strongest signal."
                        : "This match is supported more by shared modules and academic fit than by listed interests."}
                </Text>
              </View>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
