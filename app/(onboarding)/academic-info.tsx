import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

// Owner: Joel
// Sprint 2 — Onboarding screens 1–3 (Sign Up, Academic Info, Profile Setup)
export default function AcademicInfoScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold text-gray-900">Academic Info</Text>
      <Text className="mt-1 text-sm text-gray-500">Step 2 of 5</Text>

      <Text className="mt-6 text-base leading-6 text-gray-600">
        This placeholder screen stays here until the full academic information
        form lands. For now, continue to the next onboarding step.
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/(onboarding)/profile-setup")}
        activeOpacity={0.85}
        className="mt-8 rounded-2xl bg-primary py-4 items-center"
      >
        <Text className="text-base font-semibold text-white">Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
