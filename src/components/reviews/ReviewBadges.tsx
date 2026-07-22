import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { tierMeta } from "@lib/badges";
import type { BadgeTier } from "@appTypes/index";

const STAR_ON = "#E8B23C";
const STAR_OFF = "#D9DAE2";

export function TierChip({
  tier,
  size = 18,
}: {
  tier: BadgeTier | null;
  size?: number;
}) {
  const meta = tierMeta(tier);

  return (
    <LinearGradient
      colors={meta.gradient}
      style={[styles.chip, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Ionicons name="star" size={size * 0.5} color="#FFFFFF" />
    </LinearGradient>
  );
}

export function TierBadge({ tier }: { tier: BadgeTier | null }) {
  const meta = tierMeta(tier);

  return (
    <View style={[styles.badge, { backgroundColor: meta.soft }]}>
      <TierChip tier={tier} size={18} />
      <Text style={[styles.badgeText, { color: meta.ink }]}>{meta.label}</Text>
    </View>
  );
}

export function StarRow({
  average = 0,
  size = 13,
}: {
  average?: number;
  size?: number;
}) {
  const roundedAverage = Math.round(average);

  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Ionicons
          key={index}
          name="star"
          size={size}
          color={index <= roundedAverage ? STAR_ON : STAR_OFF}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignItems: "center",
    borderRadius: 100,
    flexDirection: "row",
    gap: 5,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  starRow: {
    flexDirection: "row",
    gap: 1,
  },
});
