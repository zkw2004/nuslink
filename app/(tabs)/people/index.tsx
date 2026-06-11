import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppAvatar,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  CompatibilityBadge,
  SectionCard,
} from "@components/shared";
import { useMatchesStore } from "@store/index";

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
  const peopleMatches = useMatchesStore((state) => state.peopleMatches);
  const availableModules = useMatchesStore((state) => state.availableModules);
  const semester = useMatchesStore((state) => state.semester);
  const isLoading = useMatchesStore((state) => state.isLoading);
  const error = useMatchesStore((state) => state.error);
  const refreshPeopleMatches = useMatchesStore((state) => state.refreshPeopleMatches);

  const [query, setQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string>("all");

  useEffect(() => {
    void refreshPeopleMatches(activeModule === "all" ? undefined : activeModule);
  }, [activeModule, refreshPeopleMatches]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="People"
        subtitle="Discover module-mates for the current semester, ranked by target-grade alignment and timetable overlap when available."
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
            Connection requests are the next Milestone 2 slice. For now, this view is live for search, module filtering, and compatibility ranking.
          </Text>
        </SectionCard>

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

              <View className="mt-4 gap-3 rounded-[16px] bg-[#F7F9FC] p-3">
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
              </View>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
