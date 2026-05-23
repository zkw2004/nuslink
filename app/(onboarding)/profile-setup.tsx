import { View, Text } from "react-native";

// Owner: Joel
// Sprint 2 — Onboarding screens 1–3 (Sign Up, Academic Info, Profile Setup)
export default function ProfileSetupScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold text-gray-900">Profile Setup</Text>
      <Text className="mt-1 text-sm text-gray-500">Step 3 of 5</Text>
    </View>
  );
}
