import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-5 bg-white">
        <Text className="text-xl font-bold text-gray-900">
          This screen does not exist.
        </Text>
        <Link href="/" className="mt-4 py-3">
          <Text className="text-primary text-base">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
