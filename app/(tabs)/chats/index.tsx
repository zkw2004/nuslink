import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppChip, AppScreenHeader, SectionCard } from "@components/shared";

export default function ChatsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Chats"
        subtitle="Direct messages and richer chat surfaces are scheduled for Milestone 2."
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
            Messaging will arrive after the M1 group flow is working end to end.
            For now, focus on onboarding, real profiles, creating public groups,
            and joining them through Discover.
          </Text>
        </SectionCard>

        <View className="flex-row flex-wrap gap-2">
          <AppChip label="Group chat later" />
          <AppChip label="Direct messages later" variant="outline" />
          <AppChip label="Unread inbox later" variant="outline" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
