import { View, Text } from "react-native";

// Owner: Joel
// Sprint 1 — Sign-up & login screens (email flow)
export default function SignInScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-gray-900">Welcome back</Text>
      <Text className="mt-2 text-base text-gray-500">Sign in to NUSLink</Text>
    </View>
  );
}
