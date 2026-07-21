import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { ProfileReadOnlyScreen } from "@features/profile/ProfileReadOnlyScreen";
import { fetchProfileViewModel, type ProfileViewModel } from "@services/index";
import { useAuthStore, useNotificationsStore } from "@store/index";

export default function ProfileIndexScreen() {
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);

  const [viewModel, setViewModel] = useState<ProfileViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!profile) {
        if (isActive) {
          setViewModel(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const nextViewModel = await fetchProfileViewModel(profile.id, profile);

        if (isActive) {
          setViewModel(nextViewModel);
        }
      } catch {
        if (isActive) {
          setViewModel(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [profile]);

  function handleOpenNotifications() {
    router.push("/(tabs)/notifications");
  }

  function handleOpenSettings() {
    router.push("/profile/settings" as never);
  }

  function handleSignOut() {
    Alert.alert("Sign out?", "You will need to sign in again to keep using NUSLink.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await signOut();
              router.replace("/(auth)/sign-in" as never);
            } catch (error) {
              Alert.alert(
                "Could not sign out",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          })();
        },
      },
    ]);
  }

  if (!profile || isLoading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color="#5B4FE0" size="small" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ProfileReadOnlyScreen
      badgeTierLabel={viewModel?.badgeTierLabel ?? "New"}
      modules={viewModel?.modules ?? []}
      onOpenNotifications={handleOpenNotifications}
      onOpenSettings={handleOpenSettings}
      onSignOut={handleSignOut}
      profile={profile}
      unreadCount={unreadCount}
    />
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: "center",
    backgroundColor: "#E7EBF7",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#5C6370",
    fontSize: 14,
  },
});
