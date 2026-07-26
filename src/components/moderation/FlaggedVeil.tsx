import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COPY, FLAG, onDark } from "./moderationTheme";

type FlaggedVeilProps = {
  label?: string;
  children: ReactNode;
  dark?: boolean;
  compact?: boolean;
};

export function FlaggedVeil({
  label = COPY.flaggedLabel,
  children,
  dark = false,
  compact = false,
}: FlaggedVeilProps) {
  const [shown, setShown] = useState(false);
  const ink = dark ? onDark.flagInk : FLAG.ink;
  const chip = dark ? onDark.flagChip : FLAG.chip;

  if (!shown) {
    return (
      <View
        style={[
          styles.strip,
          compact ? styles.stripCompact : null,
          dark ? styles.stripDark : null,
        ]}
      >
        <Ionicons name="warning-outline" size={15} color={ink} />
        <Text style={[styles.stripText, { color: ink }]} numberOfLines={2}>
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShown(true)}
          style={[styles.pill, { backgroundColor: chip }]}
        >
          <Text style={[styles.pillText, { color: ink }]}>{COPY.showAnyway}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.revealed}>
      {children}
      <Pressable
        accessibilityRole="button"
        onPress={() => setShown(false)}
        style={[styles.hidePill, { backgroundColor: chip }]}
      >
        <Ionicons name="warning-outline" size={11} color={ink} />
        <Text style={[styles.hideText, { color: ink }]}>{COPY.hide}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    backgroundColor: FLAG.soft,
    borderColor: FLAG.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  stripCompact: {
    borderRadius: 13,
    paddingVertical: 9,
  },
  stripDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  stripText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
  pill: {
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  revealed: {
    gap: 6,
  },
  hidePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 100,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  hideText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
