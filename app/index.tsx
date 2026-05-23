import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { isSupabaseConfigured, supabase } from "@lib/supabase";

export default function Index() {
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
}
