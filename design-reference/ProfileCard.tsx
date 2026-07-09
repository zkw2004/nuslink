/**
 * NUSLink Profile Card — React Native reference implementation
 *
 * Static reference export of the enhanced profile card design.
 * Structured in the five zones described in the design report:
 *   1. Identity   — avatar, name, liveness dot, degree/year/hall, match pill
 *   2. Intent     — the single accent-colored focal pill
 *   3. Bio        — 2-line clamp
 *   4. Chips      — filled (modules) + outlined (skills) + "+n" overflow
 *   5. Reasoning  — hairline meta strip + Connect / view-profile actions
 *
 * No external UI libraries — plain View/Text/Pressable/Image so it drops
 * into any RN project. Swap PLACEHOLDER_AVATAR for a real <Image source>.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";

// ---------- Types ----------

export interface MatchSignal {
  icon: string; // small glyph / emoji, keep to 1-2 chars
  text: string;
}

export interface ProfileCardData {
  name: string;
  avatar: ImageSourcePropType;
  degree: string;
  year: string;
  hall: string;
  isActive: boolean;
  activityLabel: string;
  matchPct: number;
  intentText: string;
  bio: string;
  modules: string[];
  skills: string[];
  metaSignals: MatchSignal[]; // 2-3 max, ranked by strength for this pair
}

interface ProfileCardProps {
  data: ProfileCardData;
  onConnect?: () => void;
  onViewProfile?: () => void;
}

// ---------- Component ----------

export default function ProfileCard({
  data,
  onConnect,
  onViewProfile,
}: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const chips = [
    ...data.modules.map((label) => ({ label, kind: "module" as const })),
    ...data.skills.map((label) => ({ label, kind: "skill" as const })),
  ];

  const MAX_VISIBLE = 4;
  const visibleChips = expanded ? chips : chips.slice(0, MAX_VISIBLE);
  const hiddenCount = chips.length - MAX_VISIBLE;

  return (
    <View style={styles.card}>
      {/* Zone 1 — Identity */}
      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <Image source={data.avatar} style={styles.avatar} />
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{data.name}</Text>
              {data.isActive && <View style={styles.liveDot} />}
            </View>
            <Text style={styles.metaLine}>
              {data.degree} · {data.year}
            </Text>
            {data.isActive && (
              <Text style={styles.activityLabel}>{data.activityLabel}</Text>
            )}
          </View>
        </View>
        <View style={styles.matchPill}>
          <Text style={styles.matchPct}>{data.matchPct}%</Text>
        </View>
      </View>

      {/* Zone 2 — Intent */}
      <View style={styles.intentPill}>
        <View style={styles.intentDot} />
        <Text style={styles.intentText}>{data.intentText}</Text>
      </View>

      {/* Zone 3 — Bio */}
      <Text style={styles.bio} numberOfLines={2}>
        {data.bio}
      </Text>

      {/* Zone 4 — Skills + modules */}
      <View style={styles.chipRow}>
        {visibleChips.map((chip, i) => (
          <View
            key={`${chip.kind}-${chip.label}-${i}`}
            style={chip.kind === "module" ? styles.chipFilled : styles.chipOutlined}
          >
            <Text
              style={
                chip.kind === "module" ? styles.chipFilledText : styles.chipOutlinedText
              }
            >
              {chip.label}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 && (
          <Pressable style={styles.chipMore} onPress={() => setExpanded((e) => !e)}>
            <Text style={styles.chipMoreText}>
              {expanded ? "Show less" : `+${hiddenCount} more`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Zone 5 — Match reasoning + actions */}
      <View style={styles.metaStrip}>
        {data.metaSignals.map((sig, i) => (
          <View key={i} style={styles.metaSignalRow}>
            <View style={styles.metaIconBadge}>
              <Text style={styles.metaIcon}>{sig.icon}</Text>
            </View>
            <Text style={styles.metaText}>{sig.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.connectButton} onPress={onConnect}>
          <Text style={styles.connectText}>Connect</Text>
        </Pressable>
        <Pressable style={styles.viewButton} onPress={onViewProfile}>
          <Text style={styles.viewArrow}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Sample data (for reference / storybook use) ----------

export const SAMPLE_PROFILE: ProfileCardData = {
  name: "Priya Sharma",
  avatar: { uri: "https://placehold.co/88x88" },
  degree: "Computer Science",
  year: "Year 2",
  hall: "Tembusu",
  isActive: true,
  activityLabel: "Active today",
  matchPct: 82,
  intentText: "Looking for a hackathon teammate",
  bio: "Enjoys sprint-style building — happy to pull all-nighters before deadlines. Big fan of clean UI and fast iteration.",
  modules: ["CS2040S", "CS2100"],
  skills: ["React Native", "Python"],
  metaSignals: [
    { icon: "🎯", text: "Same goal: hackathon" },
    { icon: "⚙️", text: "Both use React Native" },
    { icon: "🏠", text: "Same hall" },
  ],
};

// ---------- Styles ----------

const ACCENT = "#5B4FE0"; // periwinkle accent, single accent color per design system

// Liquid-glass card. In RN, wrap the card in expo-blur's <BlurView intensity={40}
// tint="light"> (or @react-native-community/blur) to get the frosted effect —
// backgroundColor below is the translucent fill that sits on top of the blur.
// The screen behind it should use the soft periwinkle radial gradient
// (react-native-linear-gradient / expo-linear-gradient): #F6F8FD → #E7EBF7 → #C6D0E8.

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    padding: 24,
    gap: 18,
    shadowColor: "#465AAA",
    shadowOpacity: 0.4,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 20 },
    elevation: 6,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  identityLeft: { flexDirection: "row", gap: 12, alignItems: "flex-start", flexShrink: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D8DCEF" },
  identityText: { gap: 4, paddingTop: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "500", color: "#242430" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3FB56E" },
  metaLine: { fontSize: 12, color: "#7A7A87" },
  activityLabel: { fontSize: 11, color: "#96969F" },
  matchPill: {
    borderWidth: 1,
    borderColor: "#E1E1E9",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  matchPct: { fontSize: 13, fontWeight: "600", color: ACCENT },
  intentPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EDEBFB",
    borderRadius: 100,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 11,
  },
  intentDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ACCENT },
  intentText: { fontSize: 11.5, fontWeight: "500", color: "#463DBB" },
  bio: { fontSize: 13, lineHeight: 19.5, color: "#4B4B57" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipFilled: {
    backgroundColor: "#E6EDFB",
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipFilledText: { fontSize: 11, fontWeight: "500", color: "#3A5FA8" },
  chipOutlined: {
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#DADAE2",
  },
  chipOutlinedText: { fontSize: 11, fontWeight: "500", color: "#4B4B57" },
  chipMore: {
    backgroundColor: "#EEEEF2",
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipMoreText: { fontSize: 11, fontWeight: "500", color: "#71717A" },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 7,
    paddingVertical: 2,
  },
  metaSignalRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaIconBadge: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: "#F0F0F3",
    alignItems: "center",
    justifyContent: "center",
  },
  metaIcon: { fontSize: 9 },
  metaText: { fontSize: 12, color: "#54545F" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: -4 },
  connectButton: {
    flex: 1,
    backgroundColor: "#232330",
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: "center",
  },
  connectText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  viewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E1E1E9",
    alignItems: "center",
    justifyContent: "center",
  },
  viewArrow: { fontSize: 18, color: "#3A3A44", fontWeight: "600" },
});
