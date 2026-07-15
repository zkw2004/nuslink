import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton, GlassSurface } from "@components/shared";

export interface MatchSignal {
  icon: string;
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
  metaSignals: MatchSignal[];
}

interface ProfileCardProps {
  data: ProfileCardData;
  onConnect?: () => void;
  primaryActionLabel?: string;
  primaryActionVariant?: "filled" | "outline" | "passive";
  secondaryActionLabel?: string;
  secondaryActionIcon?: keyof typeof Ionicons.glyphMap;
  onSecondaryAction?: () => void;
  onViewProfile?: () => void;
}

const ACCENT = "#5B4FE0";

function InnerProfileCard({
  data,
  onConnect,
  primaryActionLabel = "Connect",
  primaryActionVariant = "filled",
  secondaryActionLabel,
  secondaryActionIcon,
  onSecondaryAction,
  onViewProfile,
}: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const chips = [
    ...data.modules.map((label) => ({ label, kind: "module" as const })),
    ...data.skills.map((label) => ({ label, kind: "skill" as const })),
  ];

  const maxVisible = 4;
  const visibleChips = expanded ? chips : chips.slice(0, maxVisible);
  const hiddenCount = chips.length - maxVisible;

  return (
    <View style={styles.inner}>
      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <Image source={data.avatar} style={styles.avatar} />
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{data.name}</Text>
              {data.isActive ? <View style={styles.liveDot} /> : null}
            </View>
            <Text style={styles.metaLine}>
              {[data.degree, data.year].filter(Boolean).join(" · ")}
            </Text>
            {data.isActive ? (
              <Text style={styles.activityLabel}>{data.activityLabel}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.matchPill}>
          <Text style={styles.matchPct}>{data.matchPct}%</Text>
        </View>
      </View>

      <View style={styles.intentPill}>
        <View style={styles.intentDot} />
        <Text style={styles.intentText}>{data.intentText}</Text>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        {data.bio}
      </Text>

      <View style={styles.chipRow}>
        {visibleChips.map((chip, index) => (
          <View
            key={`${chip.kind}-${chip.label}-${index}`}
            style={chip.kind === "module" ? styles.chipFilled : styles.chipOutlined}
          >
            <Text
              style={
                chip.kind === "module"
                  ? styles.chipFilledText
                  : styles.chipOutlinedText
              }
            >
              {chip.label}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <Pressable
            style={styles.chipMore}
            onPress={() => setExpanded((current) => !current)}
          >
            <Text style={styles.chipMoreText}>
              {expanded ? "Show less" : `+${hiddenCount} more`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {data.metaSignals.length > 0 ? (
        <View style={styles.metaStrip}>
          {data.metaSignals.map((signal, index) => (
            <View key={`${signal.text}-${index}`} style={styles.metaSignalRow}>
              <View style={styles.metaIconBadge}>
                <Text style={styles.metaIcon}>{signal.icon}</Text>
              </View>
              <Text style={styles.metaText}>{signal.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {primaryActionVariant === "passive" ? (
          <View style={styles.passiveStatePill}>
            <Text style={styles.passiveStateText}>{primaryActionLabel}</Text>
          </View>
        ) : (
          <GlassButton
            label={primaryActionLabel}
            variant={primaryActionVariant === "outline" ? "light" : "dark"}
            onPress={onConnect}
            style={primaryActionVariant === "outline" ? undefined : styles.connectButton}
          />
        )}
        {secondaryActionLabel ? (
          <GlassButton
            variant="light"
            label={secondaryActionIcon ? undefined : secondaryActionLabel}
            style={secondaryActionIcon ? styles.iconActionButton : undefined}
            onPress={onSecondaryAction}
          >
            {secondaryActionIcon ? (
              <Ionicons
                name={secondaryActionIcon}
                size={18}
                color="#5D6270"
              />
            ) : null}
          </GlassButton>
        ) : null}
        <GlassButton variant="light" style={styles.viewButton} onPress={onViewProfile}>
          <Text style={styles.viewArrow}>›</Text>
        </GlassButton>
      </View>
    </View>
  );
}

export default function ProfileCard(props: ProfileCardProps) {
  return (
    <GlassSurface tint="light" radius={26} intensity={35} style={styles.card}>
      <InnerProfileCard {...props} />
    </GlassSurface>
  );
}

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
  bio: "Enjoys sprint-style building and clean UI. Happy to iterate fast before deadlines.",
  modules: ["CS2040S", "CS2100"],
  skills: ["React Native", "Python"],
  metaSignals: [
    { icon: "🎯", text: "Same goal: hackathon" },
    { icon: "⚙️", text: "Both use React Native" },
    { icon: "🏠", text: "Same hall" },
  ],
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  inner: {
    gap: 16,
    padding: 20,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  identityLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flexShrink: 1,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D8DCEF",
  },
  identityText: {
    gap: 4,
    paddingTop: 1,
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#242430",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3FB56E",
  },
  metaLine: {
    fontSize: 12,
    color: "#7A7A87",
  },
  activityLabel: {
    fontSize: 11,
    color: "#96969F",
  },
  matchPill: {
    borderWidth: 1,
    borderColor: "#E1E1E9",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  matchPct: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT,
  },
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
  intentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
  },
  intentText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#463DBB",
  },
  bio: {
    fontSize: 13,
    lineHeight: 19.5,
    color: "#4B4B57",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipFilled: {
    backgroundColor: "#E6EDFB",
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipFilledText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#3A5FA8",
  },
  chipOutlined: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#DADAE2",
  },
  chipOutlinedText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B4B57",
  },
  chipMore: {
    backgroundColor: "#EEEEF2",
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipMoreText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#71717A",
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    paddingVertical: 2,
    rowGap: 7,
  },
  metaSignalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIconBadge: {
    alignItems: "center",
    backgroundColor: "#F0F0F3",
    borderRadius: 5,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  metaIcon: {
    fontSize: 9,
  },
  metaText: {
    color: "#54545F",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectButton: {
    flex: 1,
  },
  iconActionButton: {
    height: 44,
    width: 44,
  },
  passiveStatePill: {
    borderRadius: 100,
    backgroundColor: "#EEF1F6",
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  passiveStateText: {
    color: "#6C7380",
    fontSize: 14,
    fontWeight: "600",
  },
  viewButton: {
    width: 44,
    height: 44,
  },
  viewArrow: {
    fontSize: 18,
    color: "#3A3A44",
    fontWeight: "600",
  },
});
