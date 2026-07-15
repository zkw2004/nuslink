/**
 * ProfileScreen — NUSLink "Profile" view in the Liquid Glass aesthetic.
 *
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 * Reuses GlassSurface (LiquidGlass.jsx) for every card and GlassButton for icons.
 * See README.md for the setup + why BlurView (not backdrop-filter) is used.
 */

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "./LiquidGlass";
import GlassButton from "./GlassButton";
import BottomNav from "./BottomNav";

const ACCENT = "#5B4FE0";

const THIS_SEM = ["CS2030S", "CS2040S", "CS2100", "MA1521"];
const INTERESTS = ["AI / ML", "Software Engineering", "Finance", "Artificial Intelligence", "Random"];

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Chip({ label, variant = "outlined" }) {
  return (
    <View style={variant === "module" ? styles.chipModule : styles.chipOutlined}>
      <Text style={variant === "module" ? styles.chipModuleText : styles.chipOutlinedText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ onEdit, onTabChange, onCreate }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.headerActions}>
              <GlassButton variant="light" style={styles.iconBtn} onPress={() => {}}>
                <View>
                  <Ionicons name="notifications-outline" size={19} color="#33333F" />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
                </View>
              </GlassButton>
              <GlassButton variant="light" style={styles.iconBtn} onPress={onEdit}>
                <Ionicons name="pencil" size={17} color="#33333F" />
              </GlassButton>
              <GlassButton variant="light" style={styles.iconBtn} onPress={() => {}}>
                <Ionicons name="settings-outline" size={18} color="#33333F" />
              </GlassButton>
            </View>
          </View>

          {/* Identity */}
          <View style={styles.identity}>
            <LinearGradient colors={["#6f8a6a", "#3b5566", "#8a7fa8"]} style={styles.avatar} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.identityTop}>
                <Text style={styles.name}>Ray Ng</Text>
                <Text style={styles.newTag}>NEW</Text>
              </View>
              <Text style={styles.identitySub}>Computer Science · Y2</Text>
            </View>
          </View>

          {/* Completion */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <View style={styles.completionRow}>
                <Text style={styles.completionLabel}>Profile completion</Text>
                <Text style={styles.completionPct}>100%</Text>
              </View>
              <View style={styles.track}>
                <LinearGradient colors={["#5A46C8", "#3E37A0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.trackFill} />
              </View>
              <View style={styles.callout}>
                <View style={styles.calloutDot}>
                  <Ionicons name="add" size={12} color="#fff" />
                </View>
                <Text style={styles.calloutText}>
                  Milestone 1 completion is based on your core onboarding fields and current-semester modules.
                </Text>
              </View>
            </View>
          </GlassSurface>

          {/* Profile basics */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>PROFILE BASICS</SectionLabel>
              <Text style={styles.basicName}>Ray Ng</Text>
              <Text style={styles.bodyText}>Working on CS2030S</Text>
            </View>
          </GlassSurface>

          {/* Academics */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>ACADEMICS</SectionLabel>
              <Text style={styles.bodyText}>Computing · Computer Science · Year 2</Text>
            </View>
          </GlassSurface>

          {/* Study preferences */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>STUDY PREFERENCES</SectionLabel>
              <Text style={styles.bodyText}>Study mode: Online</Text>
              <Text style={styles.bodyText}>Preferred group size: 4</Text>
            </View>
          </GlassSurface>

          {/* Here for */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>HERE FOR</SectionLabel>
              <View style={styles.chipRow}>
                {["Study Group", "Hackathon", "Tutoring"].map((c) => (
                  <Chip key={c} label={c} />
                ))}
              </View>
            </View>
          </GlassSurface>

          {/* This semester */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>THIS SEMESTER · 4</SectionLabel>
              <View style={styles.chipRow}>
                {THIS_SEM.map((m) => (
                  <Chip key={m} label={m} variant="module" />
                ))}
              </View>
            </View>
          </GlassSurface>

          {/* Interests */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>INTERESTS</SectionLabel>
              <View style={styles.chipRow}>
                {INTERESTS.map((t) => (
                  <Chip key={t} label={t} />
                ))}
              </View>
            </View>
          </GlassSurface>

          {/* Skills */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>SKILLS</SectionLabel>
              <View style={styles.chipRow}>
                <Chip label="Claude Code" />
              </View>
            </View>
          </GlassSurface>

          {/* CCA / residence */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>CCA / RESIDENCE CONTEXT</SectionLabel>
              <Text style={styles.bodyText}>Hall / residence: Not set</Text>
              <View style={styles.chipRow}>
                <Chip label="Basketball" />
                <Chip label="Tennis" />
              </View>
            </View>
          </GlassSurface>

          {/* Timetable */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <SectionLabel>TIMETABLE AVAILABILITY · 0</SectionLabel>
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>NUSMods timetable connected</Text>
                <Text style={styles.subCardText}>Used behind the scenes to calculate schedule-overlap matching.</Text>
              </View>
            </View>
          </GlassSurface>
        </ScrollView>

        <BottomNav active="profile" onChange={onTabChange} onCreate={onCreate} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: "#1A1A26" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  iconBtn: { width: 40, height: 40 },
  badge: {
    position: "absolute", top: -6, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: "#E5484D", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#EEF1FA",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  identity: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 76, height: 76, borderRadius: 18,
    shadowColor: "#28326E", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  identityTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 22, fontWeight: "700", color: "#1A1A26" },
  newTag: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: "#6B6B85" },
  identitySub: { fontSize: 14, color: "#6E6E80" },
  section: { width: "100%" },
  sectionInner: { padding: 18, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: "#7A7A8C" },
  completionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  completionLabel: { fontSize: 15, fontWeight: "600", color: "#2A2A38" },
  completionPct: { fontSize: 19, fontWeight: "700", color: "#1A1A26" },
  track: { height: 7, borderRadius: 100, backgroundColor: "rgba(90,110,180,0.16)", overflow: "hidden" },
  trackFill: { width: "100%", height: "100%", borderRadius: 100 },
  callout: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(230,236,250,0.55)", borderRadius: 14, padding: 12 },
  calloutDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(18,19,30,0.9)", alignItems: "center", justifyContent: "center" },
  calloutText: { flex: 1, fontSize: 12.5, lineHeight: 17.5, color: "#54546A" },
  basicName: { fontSize: 15, fontWeight: "600", color: "#2A2A38" },
  bodyText: { fontSize: 14, color: "#54546A", lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipModule: { backgroundColor: "#E6EDFB", borderWidth: 1, borderColor: "#CBD8F2", borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14 },
  chipModuleText: { fontSize: 13, fontWeight: "600", color: "#3A5FA8" },
  chipOutlined: { backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "#DADAE2", borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14 },
  chipOutlinedText: { fontSize: 13, color: "#45455A" },
  subCard: { backgroundColor: "rgba(230,236,250,0.55)", borderRadius: 14, padding: 14, gap: 4 },
  subCardTitle: { fontSize: 14, fontWeight: "600", color: "#2A2A38" },
  subCardText: { fontSize: 12.5, lineHeight: 17.5, color: "#6E6E80" },
});
