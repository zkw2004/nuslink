import { ActivityIndicator, Text, View } from "react-native";

interface AppLoadingScreenProps {
  message?: string;
}

export function AppLoadingScreen({
  message = "Loading your workspace...",
}: AppLoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <ActivityIndicator size="small" color="#0F1115" />
      <Text className="mt-4 text-sm font-medium text-gray-500">{message}</Text>
    </View>
  );
}
