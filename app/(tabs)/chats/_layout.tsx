import { Stack } from "expo-router";

export default function ChatsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[conversationId]" />
      <Stack.Screen name="group/[groupId]" />
      <Stack.Screen name="community/[communityId]" />
      <Stack.Screen name="archived" />
      <Stack.Screen
        name="info"
        options={{
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
          presentation: "transparentModal",
        }}
      />
    </Stack>
  );
}
