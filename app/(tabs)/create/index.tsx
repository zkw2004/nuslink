import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppChip,
  AppScreenHeader,
  SectionCard,
  SectionHeader,
} from "@components/shared";

const groupTypes = [
  { label: "Study group", value: "study_group" },
  { label: "Hackathon team", value: "hackathon_team" },
  { label: "Project team", value: "project_team" },
  { label: "Tutoring session", value: "tutoring_session" },
] as const;

const suggestedModules = ["CS2030S", "CS2040S", "MA2001", "IS1108"];

export default function CreateScreen() {
  const [groupName, setGroupName] = useState("");
  const [selectedGroupType, setSelectedGroupType] = useState<string | null>(
    "study_group",
  );
  const [moduleCode, setModuleCode] = useState("");

  const canCreate = useMemo(() => {
    return (
      groupName.trim().length > 0 &&
      selectedGroupType !== null &&
      moduleCode.trim().length > 0
    );
  }, [groupName, moduleCode, selectedGroupType]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F1EA" }}>
      <AppScreenHeader
        title="Create Group"
        subtitle="Manual public-group creation for Milestone 1. More advanced privacy and AI tools come later."
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <SectionHeader title="Group Name" />
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. CS2040S Midterm Prep"
            placeholderTextColor="#9B8C7D"
            className="rounded-[18px] border border-[#DED5CA] bg-[#FCFAF7] px-4 py-4 text-[15px] text-gray-900"
          />
          <Text className="mt-2 text-[12px] text-gray-500">
            Keep it clear and easy to scan in Discover.
          </Text>
        </SectionCard>

        <SectionCard className="mb-4">
          <SectionHeader title="Group Type" />
          <View className="flex-row flex-wrap gap-2">
            {groupTypes.map((groupType) => {
              const isSelected = selectedGroupType === groupType.value;

              return (
                <Text
                  key={groupType.value}
                  onPress={() => setSelectedGroupType(groupType.value)}
                  className={`rounded-full border px-4 py-3 text-[13px] font-semibold ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-[#DED5CA] bg-white text-[#5A4B41]"
                  }`}
                >
                  {groupType.label}
                </Text>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard className="mb-4">
          <SectionHeader title="Module" />
          <TextInput
            value={moduleCode}
            onChangeText={setModuleCode}
            autoCapitalize="characters"
            placeholder="Enter a module code"
            placeholderTextColor="#9B8C7D"
            className="rounded-[18px] border border-[#DED5CA] bg-[#FCFAF7] px-4 py-4 text-[15px] uppercase text-gray-900"
          />

          <Text className="mt-3 text-[12px] font-semibold text-gray-500">
            Quick picks
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {suggestedModules.map((suggestedModule) => (
              <Text
                key={suggestedModule}
                onPress={() => setModuleCode(suggestedModule)}
                className="rounded-full border border-transparent bg-[#EAF3FB] px-3 py-2 text-[13px] font-medium text-accent"
              >
                {suggestedModule}
              </Text>
            ))}
          </View>
        </SectionCard>

        <SectionCard className="mb-5">
          <SectionHeader title="Privacy" />
          <View className="rounded-[18px] bg-primary/10 px-4 py-4">
            <Text className="text-[14px] font-semibold text-primary">
              Public groups only in M1
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-[#7A6657]">
              Anyone using the app can discover and join this group. Semi-private
              and private flows are intentionally deferred to a later milestone.
            </Text>
          </View>
        </SectionCard>

        <View className="mb-3 flex-row flex-wrap gap-2">
          <AppChip label="Manual flow" />
          <AppChip label="No AI autofill yet" variant="outline" />
          <AppChip label="Public discoverability" variant="outline" />
        </View>

        <AppButton
          label="Create public group"
          disabled={!canCreate}
          onPress={() => undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
