import { Redirect, Stack } from "expo-router";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore } from "@store/index";

export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);

  if (session && (isProfileLoading || !profile)) {
    return <AppLoadingScreen />;
  }

  if (session && profile?.onboarding_completed) {
    return <Redirect href="/(tabs)/discover" />;
  }

  if (session) {
    return <Redirect href="/(onboarding)/academic-info" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
