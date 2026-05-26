import { Redirect, Stack } from "expo-router";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore } from "@store/index";

export default function OnboardingLayout() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);

  if (!isInitialized || (session && isProfileLoading && !profile)) {
    return <AppLoadingScreen message="Loading onboarding..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile?.onboarding_completed) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="academic-info" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="intent" />
    </Stack>
  );
}
