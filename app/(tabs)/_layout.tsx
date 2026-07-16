import { useEffect } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppLoadingScreen } from "@components/ui";
import { useAuthStore, useNotificationsStore } from "@store/index";

type LiquidGlassTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];
type NestedRouteState = {
  index?: number;
  routes?: { name?: string }[];
};

const TABS = [
  { key: "discover", label: "Discover", icon: "search" },
  { key: "people", label: "People", icon: "people" },
  { key: "chats", label: "Chats", icon: "chatbubble-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
] as const;

const ACTIVE = "#16172A";
const INACTIVE = "#7E7E8C";

function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: LiquidGlassTabBarProps) {
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  function routeForKey(key: string) {
    return state.routes.find((route) => route.name === key);
  }

  function isRouteActive(key: string) {
    return state.routes[state.index]?.name === key;
  }

  function navigateTo(key: string) {
    const route = routeForKey(key);

    if (!route) {
      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isRouteActive(key) && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  function getNestedRouteName(route: (typeof state.routes)[number]) {
    const nestedState = route.state as NestedRouteState | undefined;
    const nestedIndex = nestedState?.index ?? 0;

    return nestedState?.routes?.[nestedIndex]?.name;
  }

  const activeRoute = state.routes[state.index];
  const activeNestedRouteName = activeRoute ? getNestedRouteName(activeRoute) : undefined;

  if (
    activeRoute?.name === "chats" &&
    activeNestedRouteName &&
    activeNestedRouteName !== "index"
  ) {
    return null;
  }

  function renderTab(tab: (typeof TABS)[number]) {
    const route = routeForKey(tab.key);
    const isActive = isRouteActive(tab.key);

    if (!route) {
      return null;
    }

    const options = descriptors[route.key]?.options;

    return (
      <Pressable
        key={tab.key}
        accessibilityLabel={options?.tabBarAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={isActive ? { selected: true } : {}}
        onPress={() => navigateTo(tab.key)}
        style={styles.tab}
      >
        <Ionicons
          name={tab.icon}
          size={23}
          color={isActive ? ACTIVE : INACTIVE}
        />
        <Text
          style={[
            styles.label,
            {
              color: isActive ? ACTIVE : INACTIVE,
              fontWeight: isActive ? "700" : "500",
            },
          ]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <BlurView
          intensity={45}
          tint="systemChromeMaterialLight"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(255,255,255,0.42)" },
          ]}
        />
        <View pointerEvents="none" style={styles.specularBorder} />

        <View style={styles.row}>
          {leftTabs.map(renderTab)}

          <Pressable style={styles.createWrap} onPress={() => navigateTo("create")}>
            <View style={styles.createButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          </Pressable>

          {rightTabs.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoading = useAuthStore((state) => state.isProfileLoading);
  const hasProfileLoaded = useAuthStore((state) => state.hasProfileLoaded);
  const refreshNotifications = useNotificationsStore(
    (state) => state.refreshNotifications,
  );

  useEffect(() => {
    if (!session?.user.id || !profile?.onboarding_completed) {
      return;
    }

    void refreshNotifications(session.user.id);
  }, [profile?.onboarding_completed, refreshNotifications, session?.user.id]);

  if (!isInitialized || isProfileLoading || (session && !hasProfileLoaded)) {
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
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="people" options={{ title: "People" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          popToTopOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 16,
    left: 16,
    pointerEvents: "box-none",
    position: "absolute",
    right: 16,
  },
  bar: {
    borderRadius: 30,
    elevation: 10,
    height: 66,
    overflow: "hidden",
    shadowColor: "#3240A0",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === "ios" ? 0.5 : 0.35,
    shadowRadius: 26,
  },
  row: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontSize: 10.5,
  },
  createWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  createButton: {
    alignItems: "center",
    backgroundColor: "rgba(18,19,30,0.94)",
    borderRadius: 20,
    elevation: 6,
    height: 40,
    justifyContent: "center",
    shadowColor: "#141838",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    width: 40,
  },
  specularBorder: {
    borderBottomColor: "rgba(90,110,180,0.18)",
    borderBottomWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.55)",
    borderLeftWidth: 1,
    borderRadius: 30,
    borderRightColor: "rgba(90,110,180,0.14)",
    borderRightWidth: 1,
    borderTopColor: "rgba(255,255,255,0.7)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
