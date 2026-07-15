/**
 * EditProfileScreen — NUSLink "Edit profile" form in the Liquid Glass aesthetic.
 *
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 * Glass cards use GlassSurface; primary/secondary actions use GlassButton;
 * text inputs use the GlassField helper below (BlurView + tint + specular border).
 */

import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "./LiquidGlass";
import GlassButton from "./GlassButton";
import BottomNav from "./BottomNav";

const CCA_OPTIONS = [
  "Adventure Club", "Arts & Culture", "Basketball", "Case Competitions",
  "Community Service", "Dance", "Debate", "Entrepreneurship", "Hackathons",
  "Music", "NUS Hackers", "Photography", "Sports",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Frosted-glass text field. */
function GlassField({ style, multiline, ...props }) {
  return (
    <View style={[styles.field, multiline && { height: 76 }, style]}>
      <BlurView intensity={30} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.42)" }]} />
      <TextInput
        multiline={multiline}
        placeholderTextColor="#8A8A9C"
        style={styles.fieldInput}
        {...props}
      />
    </View>
  );
}

/** Toggleable glass pill (CCA tags, day picker). */
function TogglePill({ label, on, onPress }) {
  return (
    <GlassButton
      variant={on ? "dark" : "light"}
      label={label}
      onPress={onPress}
      radius={100}
      style={{ marginRight: 0 }}
      textStyle={{ fontSize: 13, fontWeight: on ? "600" : "500", color: on ? "#fff" : "#45455A" }}
    />
  );
}

export default function EditProfileScreen({ onDone, onTabChange, onCreate }) {
  const [cca, setCca] = useState({ Basketball: true });
  const [days, setDays] = useState({ Mon: true });
  const [name, setName] = useState("Ray Ng");
  const [working, setWorking] = useState("Working on CS2030S");

  const toggle = (setter) => (key) => setter((s) => ({ ...s, [key]: !s[key] }));

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
            <View style={styles.headerLeft}>
              <GlassButton variant="light" style={styles.iconBtn} onPress={onDone}>
                <Ionicons name="chevron-back" size={18} color="#33333F" />
              </GlassButton>
              <Text style={styles.title}>Edit profile</Text>
            </View>
            <GlassButton variant="dark" label="Done" onPress={onDone} textStyle={{ fontSize: 13 }} />
          </View>

          {/* Identity with edit pencil */}
          <View style={styles.identity}>
            <View style={{ width: 76, height: 76 }}>
              <LinearGradient colors={["#6f8a6a", "#3b5566", "#8a7fa8"]} style={styles.avatar} />
              <View style={styles.avatarEdit}>
                <Ionicons name="pencil" size={13} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.name}>Ray Ng</Text>
              <Text style={styles.identitySub}>Computer Science · Y2</Text>
            </View>
          </View>

          {/* Profile basics */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionLabel}>PROFILE BASICS</Text>
              <GlassField value={name} onChangeText={setName} />
              <GlassField value={working} onChangeText={setWorking} multiline />
            </View>
          </GlassSurface>

          {/* Academics */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionLabel}>ACADEMICS</Text>
              <GlassField defaultValue="Computing" />
              <GlassField defaultValue="Computer Science" />
            </View>
          </GlassSurface>

          {/* Skills */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionLabel}>SKILLS</Text>
              <Text style={styles.helpText}>
                Add concrete skills you can actually contribute, such as coding languages, design tools, writing, analysis, or facilitation.
              </Text>
              <View style={styles.skillPill}>
                <Text style={styles.skillPillText}>Claude Code</Text>
              </View>
              <View style={styles.inlineRow}>
                <GlassField placeholder="Add a skill" style={{ flex: 1 }} />
                <GlassButton variant="dark" label="Add" onPress={() => {}} />
              </View>
              <View style={styles.chipRow}>
                <View style={styles.removableChip}>
                  <Text style={styles.removableChipText}>Claude Code</Text>
                  <Ionicons name="close" size={13} color="#8A8A9C" />
                </View>
              </View>
            </View>
          </GlassSurface>

          {/* CCA / residence */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionLabel}>CCA / RESIDENCE CONTEXT</Text>
              <GlassField placeholder="Hall / residence" />
              <Text style={styles.helpText}>
                Keep these broad and honest so the matching service can use them as lightweight shared-context signals.
              </Text>
              <View style={styles.chipRow}>
                {CCA_OPTIONS.map((c) => (
                  <TogglePill key={c} label={c} on={!!cca[c]} onPress={() => toggle(setCca)(c)} />
                ))}
              </View>
            </View>
          </GlassSurface>

          {/* Timetable */}
          <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionLabel}>TIMETABLE AVAILABILITY · 0</Text>

              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Import from NUSMods</Text>
                <Text style={styles.subCardText}>
                  Paste your NUSMods timetable share URL. We show matched slots, then save the derived availability for matching.
                </Text>
                <GlassField placeholder="https://nusmods.com/timetable/sem-1/sha..." />
                <GlassButton variant="dark" label="Import share URL" onPress={() => {}} style={{ width: "100%" }} />
              </View>

              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>NUSMods timetable connected</Text>
                <Text style={styles.subCardText}>Imported lesson timing is used behind the scenes to calculate overlap.</Text>
                <GlassButton variant="light" label="Remove imported timetable" onPress={() => {}} style={{ width: "100%" }} textStyle={{ color: "#33333F" }} />
              </View>

              <View style={{ gap: 12 }}>
                <Text style={styles.subCardTitle}>Manual fallback</Text>
                <Text style={styles.subCardText}>Add extra free blocks manually if you prefer certain study windows.</Text>
                <View style={styles.chipRow}>
                  {DAYS.map((d) => (
                    <TogglePill key={d} label={d} on={!!days[d]} onPress={() => toggle(setDays)(d)} />
                  ))}
                </View>
                <View style={styles.inlineRow}>
                  <GlassField defaultValue="09:00" style={{ flex: 1 }} />
                  <GlassField defaultValue="11:00" style={{ flex: 1 }} />
                </View>
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: "#1A1A26" },
  identity: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 76, height: 76, borderRadius: 18,
    shadowColor: "#28326E", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  avatarEdit: {
    position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(18,19,30,0.9)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#EEF1FA",
  },
  name: { fontSize: 22, fontWeight: "700", color: "#1A1A26" },
  identitySub: { fontSize: 14, color: "#6E6E80" },
  section: { width: "100%" },
  sectionInner: { padding: 18, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: "#7A7A8C" },
  helpText: { fontSize: 13, lineHeight: 18.5, color: "#6E6E80" },
  field: {
    borderRadius: 14, overflow: "hidden", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.7)",
  },
  fieldInput: { paddingVertical: 13, paddingHorizontal: 15, fontSize: 14, color: "#22222E" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  skillPill: { alignSelf: "flex-start", backgroundColor: "rgba(18,19,30,0.9)", borderRadius: 100, paddingVertical: 8, paddingHorizontal: 16 },
  skillPillText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  removableChip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "#DADAE2",
    borderRadius: 100, paddingVertical: 7, paddingHorizontal: 12,
  },
  removableChipText: { fontSize: 13, color: "#45455A" },
  subCard: { backgroundColor: "rgba(230,236,250,0.5)", borderRadius: 16, padding: 16, gap: 12 },
  subCardTitle: { fontSize: 14, fontWeight: "600", color: "#22222E" },
  subCardText: { fontSize: 12.5, lineHeight: 17.5, color: "#6E6E80" },
});
