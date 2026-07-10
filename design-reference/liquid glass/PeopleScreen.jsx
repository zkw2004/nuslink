/**
 * PeopleScreen — the full NUSLink "People" screen.
 *
 * Assembles: periwinkle gradient background (uniform theme) + header +
 * Liquid Glass filter chips + scrollable feed of <ProfileCard> + floating
 * Liquid Glass <BottomNav>.
 *
 * Deps (Expo):
 *   expo install expo-blur expo-linear-gradient @expo/vector-icons
 *
 * Files in this package:
 *   LiquidGlass.jsx  — GlassSurface primitive (blur + tint + specular border)
 *   GlassButton.jsx  — dark/light/plain glass button with press reaction
 *   ProfileCard.jsx  — five-zone match card
 *   BottomNav.jsx    — floating glass tab bar
 *   data.js          — sample PEOPLE + FILTERS
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import ProfileCard from "./ProfileCard";
import BottomNav from "./BottomNav";
import { PEOPLE, FILTERS } from "./data";

export default function PeopleScreen() {
  const [tab, setTab] = useState("people");
  const [filter, setFilter] = useState(0);

  return (
    <View style={styles.root}>
      {/* Uniform periwinkle theme behind everything */}
      <LinearGradient
        colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.title}>People</Text>
              <Text style={styles.subtitle}>
                Discover module-mates for the current semester, ranked by shared
                modules, alignment, and profile fit.
              </Text>
            </View>
            <Pressable style={styles.bell}>
              <BlurView intensity={40} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.4)" }]} />
              <Ionicons name="notifications-outline" size={19} color="#33333F" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </Pressable>
          </View>

          {/* Filter chips */}
          <View style={styles.filters}>
            {FILTERS.map((f, i) => {
              const on = i === filter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(i)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  {!on && (
                    <>
                      <BlurView intensity={35} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
                      <View style={[StyleSheet.absoluteFill, styles.chipGlass]} />
                    </>
                  )}
                  <Text style={[styles.chipText, { color: on ? "#fff" : "#4A4570" }]}>{f}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Feed */}
          <View style={{ gap: 16 }}>
            {PEOPLE.map((p) => (
              <ProfileCard key={p.id} data={p} />
            ))}
          </View>
        </ScrollView>

        <BottomNav active={tab} onChange={setTab} onCreate={() => {}} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: "#1A1A26" },
  subtitle: { fontSize: 13.5, lineHeight: 19, color: "#5C5C72", maxWidth: 270 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#E5484D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#EEF1FA",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: {
    borderRadius: 100,
    overflow: "hidden",
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  chipOn: {
    backgroundColor: "#16172A",
  },
  chipOff: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  chipGlass: { backgroundColor: "rgba(255,255,255,0.34)" },
  chipText: { fontSize: 13, fontWeight: "600" },
});
