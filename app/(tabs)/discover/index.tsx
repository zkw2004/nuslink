import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
import { mockDiscoverPeople } from "@features/m1/mockData";

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F1EA" }}>
      <AppScreenHeader
        title="Discover"
        subtitle="People in your current modules who look like a strong fit for this semester."
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row gap-2">
          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-1 rounded-full border border-[#E8E1D8] bg-white px-4 py-3"
          >
            <Text className="text-center text-[14px] font-semibold text-gray-500">
              Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-1 rounded-full bg-primary px-4 py-3"
          >
            <Text className="text-center text-[14px] font-semibold text-white">
              People
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          <AppChip label="High match" variant="solid" />
          <AppChip label="Same module" />
          <AppChip label="This semester" />
          <AppChip label="Structured" variant="outline" />
        </ScrollView>

        <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.1px] text-gray-500">
          Top people matches
        </Text>

        <View className="gap-4">
          {mockDiscoverPeople.map((person) => (
            <SectionCard key={person.id}>
              <View className="flex-row gap-3">
                <AppAvatar name={person.name} size={82} rounded={false} />

                <View className="flex-1">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="flex-1 text-[18px] font-bold tracking-tight text-gray-900"
                          numberOfLines={1}
                        >
                          {person.name}
                        </Text>
                        <BadgeTierPill tier={person.badgeTier} />
                      </View>
                      <Text className="mt-1 text-[13px] text-gray-600">
                        {person.major} · Y{person.year}
                      </Text>
                    </View>

                    <CompatibilityBadge score={person.score} />
                  </View>

                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {person.modules.map((moduleCode) => (
                      <AppChip
                        key={`${person.id}-${moduleCode}`}
                        label={moduleCode}
                        variant="module"
                      />
                    ))}
                  </View>
                </View>
              </View>

              <Text className="mt-4 text-[13px] leading-5 text-gray-700">
                {person.bio}
              </Text>

              <View className="mt-4 flex-row items-center gap-4 rounded-2xl bg-[#F4EFE7] px-3.5 py-3">
                <View className="flex-1">
                  <Text className="text-[12px] font-semibold text-gray-800">
                    {person.sharedModules} shared module
                    {person.sharedModules > 1 ? "s" : ""}
                  </Text>
                  <Text className="mt-1 text-[12px] text-gray-500">
                    {person.scheduleFit}
                  </Text>
                </View>

                <View className="flex-row flex-wrap justify-end gap-2">
                  {person.skills.slice(0, 2).map((skill) => (
                    <AppChip
                      key={`${person.id}-${skill}`}
                      label={skill}
                      variant="outline"
                    />
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <AppButton label="Connect" />
              </View>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
