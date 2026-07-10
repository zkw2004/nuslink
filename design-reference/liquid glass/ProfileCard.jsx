/**
 * ProfileCard — the five-zone NUSLink match card on a Liquid Glass panel.
 *   1 Identity · 2 Intent · 3 Bio · 4 Chips (modules + skills) · 5 Reasoning + actions
 *
 * Deps: expo-blur (via GlassSurface), and GlassButton for the actions.
 */

import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { GlassSurface } from "./LiquidGlass";
import GlassButton from "./GlassButton";

const ACCENT = "#5B4FE0";

export default function ProfileCard({ data, onConnect, onOpen }) {
  const chips = [
    ...data.modules.map((label) => ({ label, kind: "module" })),
    ...data.skills.map((label) => ({ label, kind: "skill" })),
  ];

  return (
    <GlassSurface tint="light" radius={26} intensity={35} style={styles.card}>
      <View style={styles.inner}>
        {/* Zone 1 — Identity */}
        <View style={styles.identityRow}>
          <View style={styles.identityLeft}>
            {data.avatar ? (
              <Image source={data.avatar} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
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

        {/* Zone 4 — Chips */}
        <View style={styles.chipRow}>
          {chips.map((chip, i) => (
            <View
              key={`${chip.kind}-${chip.label}-${i}`}
              style={chip.kind === "module" ? styles.chipFilled : styles.chipOutlined}
            >
              <Text
                style={chip.kind === "module" ? styles.chipFilledText : styles.chipOutlinedText}
              >
                {chip.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Zone 5 — Reasoning + actions */}
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
          <GlassButton
            variant="dark"
            label="Connect"
            onPress={onConnect}
            style={{ flex: 1 }}
          />
          <GlassButton variant="light" onPress={onOpen} style={styles.arrowBtn}>
            <Text style={styles.arrow}>›</Text>
          </GlassButton>
        </View>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  inner: { padding: 20, gap: 16 },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  identityLeft: { flexDirection: "row", gap: 12, alignItems: "flex-start", flexShrink: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#C9CFE8" },
  identityText: { gap: 4, paddingTop: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "600", color: "#242430" },
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
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#DADAE2",
  },
  chipOutlinedText: { fontSize: 11, fontWeight: "500", color: "#4B4B57" },
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
  actionsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  arrowBtn: { width: 44, height: 44 },
  arrow: { fontSize: 18, color: "#3A3A44", fontWeight: "600" },
});
