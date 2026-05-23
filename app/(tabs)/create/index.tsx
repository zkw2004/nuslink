import { View, Text } from "react-native";

// Owner: Kaiwen (basic) → Joel (full group creation with all privacy types)
// Sprint 2 — Basic group creation (public groups, manual form)
export default function CreateScreen() {
  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Create Group</Text>
      </View>
    </View>
  );
}
