import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppChip, AppScreenHeader, SectionCard } from "@components/shared";

export default function CommunitiesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Communities"
        subtitle="Communities, recurring spaces, and community chat are intentionally deferred until Milestone 2."
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
            Communities will support larger ongoing spaces for clubs, interest
            groups, and semester-spanning collaboration once the M1 auth,
            onboarding, profile, and public group flow is stable.
          </Text>
        </SectionCard>

        <View className="flex-row flex-wrap gap-2">
          <AppChip label="Browse communities later" />
          <AppChip label="Create and join later" variant="outline" />
          <AppChip label="Community chat later" variant="outline" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
