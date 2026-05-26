import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@store/index";

export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

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
