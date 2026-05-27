import { Redirect } from "expo-router";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore } from "@store/index";

export default function Index() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);

  if (!isInitialized || isProfileLoading || (session && !profile)) {
    return <AppLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboarding_completed) {
    return <Redirect href="/(onboarding)/academic-info" />;
  }

  return <Redirect href="/(tabs)/discover" />;
}
