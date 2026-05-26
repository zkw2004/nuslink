import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { isSupabaseConfigured, supabase } from "@lib/supabase";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore } from "@store/index";

export default function Index() {
<<<<<<< HEAD
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);

  if (!isInitialized || (session && isProfileLoading && !profile)) {
    return <AppLoadingScreen message="Checking your account..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboarding_completed) {
    return <Redirect href="/(onboarding)/academic-info" />;
  }

  return <Redirect href="/(tabs)/discover" />;
=======
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setIsAuthenticated(Boolean(data.session));
        setIsLoading(false);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#D4471C" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)/discover" : "/(auth)/sign-in"} />;
>>>>>>> main
}
