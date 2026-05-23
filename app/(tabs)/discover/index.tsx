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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="NUSLink"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 rounded-xl bg-[#EEF2F7] p-1">
          <View className="flex-row gap-1">
            <TouchableOpacity
              activeOpacity={0.85}
              className="flex-1 rounded-[9px] px-4 py-[9px]"
            >
              <Text className="text-center text-[14px] font-semibold tracking-[-0.2px] text-[#9AA0AB]">
                Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              className="flex-1 rounded-[9px] bg-white px-4 py-[9px]"
              style={{
                shadowColor: "#141C2E",
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              }}
            >
              <Text className="text-center text-[14px] font-semibold tracking-[-0.2px] text-[#0F1115]">
                People
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            className="rounded-full border border-[#E4E9F1] bg-white px-3 py-2"
          >
            <Text className="text-[13px] font-medium text-[#5C6370]">
              Filters
            </Text>
          </TouchableOpacity>
          <AppChip label="High match" variant="solid" />
          <AppChip label="Same module" />
          <AppChip label="Year 3" />
          <AppChip label="Hackathon" />
        </ScrollView>

        <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
          Top matches near you
        </Text>

        <View className="gap-4">
          {mockDiscoverPeople.map((person) => (
            <SectionCard key={person.id} className="overflow-hidden rounded-[20px] p-0">
              <View className="flex-row gap-[14px] p-[14px]">
                <AppAvatar name={person.name} size={84} rounded={false} />

                <View className="flex-1">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="flex-1 text-[17px] font-bold tracking-[-0.4px] text-[#0F1115]"
                          numberOfLines={1}
                        >
                          {person.name}
                        </Text>
                        <BadgeTierPill tier={person.badgeTier} />
                      </View>
                      <Text className="mt-[2px] text-[13px] text-[#5C6370]">
                        {person.major} · Y{person.year}
                      </Text>
                    </View>

                    <CompatibilityBadge score={person.score} />
                  </View>

                  <View className="mt-2 flex-row flex-wrap gap-[5px]">
                    {person.modules.slice(0, 3).map((moduleCode) => (
                      <AppChip
                        key={`${person.id}-${moduleCode}`}
                        label={moduleCode}
                        variant="module"
                      />
                    ))}
                    {person.modules.length > 3 ? (
                      <Text className="self-center text-[11px] text-[#9AA0AB]">
                        +{person.modules.length - 3}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              <View className="flex-row items-center gap-[10px] border-t border-[#E4E9F1] bg-[#EEF2F7] px-[14px] py-[10px]">
                <View className="flex-1 flex-row items-center gap-3">
                  <Text className="text-[12px] text-[#5C6370]">
                    {person.sharedModules} shared
                  </Text>
                  <Text className="text-[12px] text-[#5C6370]">
                    {person.scheduleFit}
                  </Text>
                </View>

                <View className="min-w-[88px]">
                  <AppButton label="Connect" />
                </View>
              </View>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
