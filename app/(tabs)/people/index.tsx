import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppChip, AppScreenHeader, SectionCard } from "@components/shared";

export default function PeopleScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="People"
        subtitle="People discovery is preview-only in Milestone 1 while the group and community flows settle."
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <Text className="text-[17px] font-bold text-[#0F1115]">
            Milestone 2 preview
          </Text>
          <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
            This tab will become the main place to discover people with search,
            filters, compatibility sorting, and connection requests. For M1,
            it stays intentionally honest and non-functional.
          </Text>
        </SectionCard>

        <View className="flex-row flex-wrap gap-2">
          <AppChip label="People search later" />
          <AppChip label="Compatibility later" variant="outline" />
          <AppChip label="Connect later" variant="outline" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
