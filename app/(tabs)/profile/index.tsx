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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
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
        <View className="mb-4 flex-row items-center gap-[14px] px-[2px] pb-4 pt-2">
          <AppAvatar name={mockProfile.name} size={84} rounded={false} />

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[22px] font-bold tracking-[-0.6px] text-[#0F1115]">
                {mockProfile.name}
              </Text>
              <BadgeTierPill tier={mockProfile.badgeTier} />
            </View>

            <Text className="mt-[3px] text-[14px] text-[#5C6370]">
              {mockProfile.major} · Y{mockProfile.year}
            </Text>
            <Text className="mt-2 text-[12px] text-[#5C6370]">
              <Text className="font-semibold text-[#0F1115]">
                {mockProfile.connections}
              </Text>{" "}connections
            </Text>
          </View>
        </View>

        <SectionCard className="mb-4">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className="text-[14px] font-semibold text-[#0F1115]">
              Profile completion
            </Text>
            <Text className="text-[18px] font-bold tracking-[-0.4px] text-[#0F1115]">
              {mockProfile.completion}%
            </Text>
          </View>

          <ProgressBar value={mockProfile.completion} />

          <View className="mt-3 flex-row items-center gap-[10px] rounded-xl bg-[#E7EEF7] px-3 py-[10px]">
            <View className="h-4 w-4 items-center justify-center rounded-full bg-[#0F1115]">
              <Text className="text-[10px] font-bold text-white">+</Text>
            </View>
            <Text className="flex-1 text-[12px] font-medium leading-[17px] text-[#0F1115]">
              Add your timetable to improve schedule-overlap matching by roughly 30%.
            </Text>
            <View className="rounded-lg bg-[#0F1115] px-[10px] py-[6px]">
              <Text className="text-[12px] font-semibold text-white">Add</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Bio" actionLabel="Edit" />
          <Text className="text-[14px] leading-6 text-[#0F1115]">
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
          <SectionHeader
            title={`This Semester · ${mockProfile.modules.length}`}
            actionLabel="Manage"
          />
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

          <Text className="mt-[10px] text-[13px] font-semibold text-[#5B7BA3]">
            Import from resume later
          </Text>
        </SectionCard>

        <View className="mt-1 rounded-2xl bg-[#E1EAF5] px-[14px] py-3">
          <Text className="text-[13px] font-semibold text-[#5B7BA3]">
            Future boost
          </Text>
          <Text className="mt-1 text-[13px] leading-5 text-[#5B7BA3]">
            Take the short workstyle quiz later to unlock richer matching.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
