/**
 * BottomNav — floating Liquid Glass tab bar (iOS 26 style).
 *
 * Deps: expo-blur, @expo/vector-icons (ships with Expo).
 * The center "Create" action is a solid dark accent circle that sits above the
 * glass bar; the four tabs are icon + label, the active one darkened.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  { key: "discover", label: "Discover", icon: "search" },
  { key: "people", label: "People", icon: "people" },
  { key: "chats", label: "Chats", icon: "chatbubble-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
];

const ACTIVE = "#16172A";
const INACTIVE = "#7E7E8C";

export default function BottomNav({ active = "people", onChange, onCreate }) {
  // render order: discover, people, [create], chats, profile
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const Tab = ({ t }) => {
    const on = active === t.key;
    return (
      <Pressable style={styles.tab} onPress={() => onChange?.(t.key)}>
        <Ionicons name={t.icon} size={23} color={on ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: on ? ACTIVE : INACTIVE, fontWeight: on ? "700" : "500" }]}>
          {t.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <BlurView
          intensity={45}
          tint="systemChromeMaterialLight"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.42)" }]} />
        {/* specular border */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 30,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderTopColor: "rgba(255,255,255,0.7)",
              borderLeftColor: "rgba(255,255,255,0.55)",
              borderBottomWidth: 1,
              borderRightWidth: 1,
              borderBottomColor: "rgba(90,110,180,0.18)",
              borderRightColor: "rgba(90,110,180,0.14)",
            },
          ]}
        />

        <View style={styles.row}>
          {left.map((t) => (
            <Tab key={t.key} t={t} />
          ))}

          {/* Create */}
          <Pressable style={styles.createWrap} onPress={onCreate}>
            <View style={styles.createBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
          </Pressable>

          {right.map((t) => (
            <Tab key={t.key} t={t} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  bar: {
    height: 66,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#3240A0",
    shadowOpacity: 0.5,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 6 },
  label: { fontSize: 10.5 },
  createWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(18,19,30,0.94)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#141838",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
