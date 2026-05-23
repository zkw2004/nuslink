import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="academic-info" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="intent" />
    </Stack>
  );
}
