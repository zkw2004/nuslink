import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore } from "@store/index";

export default function TabLayout() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);

  if (!isInitialized || isProfileLoading || (session && !profile)) {
    return <AppLoadingScreen message="Loading your workspace..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboarding_completed) {
    return <Redirect href="/(onboarding)/academic-info" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0F1115",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E4E9F1",
          backgroundColor: "#FFFFFF",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "person.2.fill", android: "group", web: "group" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: () => (
            <SymbolView
              name={{ ios: "plus.circle.fill", android: "add_circle", web: "add_circle" }}
              tintColor="#0F1115"
              size={32}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "bubble.left.and.bubble.right.fill",
                android: "chat",
                web: "chat",
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "person.circle.fill", android: "account_circle", web: "account_circle" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
