import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppAvatar,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  ProgressBar,
  SectionCard,
  SectionHeader,
} from "@components/shared";
import { mockProfile } from "@features/m1/mockData";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F1EA" }}>
      <AppScreenHeader
        title="Profile"
        actions={[
          { icon: "sparkles", accessibilityLabel: "View profile tips" },
          { icon: "gearshape.fill", accessibilityLabel: "Open settings" },
        ]}
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center gap-4">
          <AppAvatar name={mockProfile.name} size={84} rounded={false} />

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[24px] font-bold tracking-tight text-gray-900">
                {mockProfile.name}
              </Text>
              <BadgeTierPill tier={mockProfile.badgeTier} />
            </View>

            <Text className="mt-1 text-[14px] text-gray-600">
              {mockProfile.major} · Y{mockProfile.year}
            </Text>
            <Text className="mt-2 text-[12px] text-gray-500">
              <Text className="font-semibold text-gray-800">
                {mockProfile.connections}
              </Text>{" "}
              connections
            </Text>
          </View>
        </View>

        <SectionCard className="mb-4">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className="text-[15px] font-semibold text-gray-900">
              Profile completion
            </Text>
            <Text className="text-[20px] font-bold tracking-tight text-primary">
              {mockProfile.completion}%
            </Text>
          </View>

          <ProgressBar value={mockProfile.completion} />

          <View className="mt-4 rounded-2xl bg-primary/10 px-3.5 py-3">
            <Text className="text-[13px] font-semibold text-primary">
              Add your timetable later to improve schedule-overlap matching.
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-[#7A6657]">
              This branch keeps profile prompts visual-only, but the completion
              card is ready for future onboarding and profile upgrades.
            </Text>
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Bio" actionLabel="Edit" />
          <Text className="text-[14px] leading-6 text-gray-700">
            {mockProfile.bio}
          </Text>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Here For" actionLabel="Edit" />
          <View className="flex-row flex-wrap gap-2">
            {mockProfile.intents.map((intent) => (
              <AppChip key={intent} label={intent} />
            ))}
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="This Semester" actionLabel="Manage" />
          <View className="flex-row flex-wrap gap-2">
            {mockProfile.modules.map((moduleCode) => (
              <AppChip
                key={moduleCode}
                label={moduleCode}
                variant="module"
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Interests" actionLabel="Edit" />
          <View className="flex-row flex-wrap gap-2">
            {mockProfile.interests.map((interest) => (
              <AppChip
                key={interest}
                label={interest}
                variant="outline"
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Skills" actionLabel="Edit" />
          <View className="flex-row flex-wrap gap-2">
            {mockProfile.skills.map((skill) => (
              <AppChip key={skill} label={skill} variant="outline" />
            ))}
          </View>

          <Text className="mt-3 text-[12px] font-medium text-accent">
            Resume import is planned for a later milestone.
          </Text>
        </SectionCard>

        <View className="mt-2 rounded-[22px] bg-accent/10 px-4 py-4">
          <Text className="text-[13px] font-semibold text-accent">
            Future boost
          </Text>
          <Text className="mt-1 text-[12px] leading-5 text-[#566573]">
            A short workstyle quiz and richer profile fields can unlock more
            nuanced matching later, but they are intentionally out of scope for
            this M1 branch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
