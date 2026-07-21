import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppAvatar, AppNotificationBell } from "@components/shared";
import { GlassButton, GlassSurface } from "@components/shared";
import type { UserProfile } from "@appTypes/index";

const INTENT_LABELS: Record<UserProfile["intents"][number], string> = {
  study_group: "Study groups",
  hackathon: "Hackathons / comps",
  tutoring: "Tutoring / TA",
  internship_networking: "Internship networking",
};

type Props = {
  badgeTierLabel: "New" | "Reliable" | "Trusted" | "Standout";
  modules: string[];
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  profile: UserProfile;
  unreadCount: number;
};

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <GlassSurface tint="light" radius={22} intensity={35} style={styles.section}>
      <View style={styles.sectionInner}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {children}
      </View>
    </GlassSurface>
  );
}

function Chip({
  label,
  variant = "outline",
}: {
  label: string;
  variant?: "intent" | "module" | "outline";
}) {
  return (
    <View
      style={[
        styles.chip,
        variant === "intent"
          ? styles.intentChip
          : variant === "module"
            ? styles.moduleChip
            : styles.outlineChip,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          variant === "intent"
            ? styles.intentChipText
            : variant === "module"
              ? styles.moduleChipText
              : styles.outlineChipText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function formatProgramYear(profile: UserProfile) {
  const academicParts = [profile.major, profile.faculty].filter(Boolean);
  const yearLabel = profile.year_of_study ? `Year ${profile.year_of_study}` : null;
  const firstLine = academicParts.length > 0 ? academicParts.join(" · ") : "NUS student";

  return yearLabel ? `${firstLine} · ${yearLabel}` : firstLine;
}

export function ProfileReadOnlyScreen({
  badgeTierLabel,
  modules,
  onOpenNotifications,
  onOpenSettings,
  onSignOut,
  profile,
  unreadCount,
}: Props) {
  const headline =
    profile.headline?.trim() ||
    profile.bio?.trim() ||
    "Add a short headline in Settings to introduce yourself.";
  const about =
    profile.bio?.trim() ||
    "Add a little more about yourself in Settings so your profile feels complete.";
  const hereFor = profile.intents.map((intent) => INTENT_LABELS[intent]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.actions}>
              <AppNotificationBell
                unreadCount={unreadCount}
                onPress={onOpenNotifications}
              />
              <GlassButton
                accessibilityLabel="Open profile settings"
                style={styles.iconButton}
                variant="light"
                onPress={onOpenSettings}
              >
                <Ionicons name="settings-outline" size={18} color="#33333F" />
              </GlassButton>
              <GlassButton
                accessibilityLabel="Sign out"
                style={styles.iconButton}
                variant="light"
                onPress={onSignOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#33333F" />
              </GlassButton>
            </View>
          </View>

          <View style={styles.identityBlock}>
            <View style={styles.identityRow}>
              <AppAvatar
                name={profile.display_name}
                size={76}
                rounded={false}
                imageUri={profile.avatar_url}
              />
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{profile.display_name}</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{badgeTierLabel}</Text>
                  </View>
                </View>
                <Text style={styles.identitySub}>{formatProgramYear(profile)}</Text>
              </View>
            </View>
            <Text style={styles.headline}>{headline}</Text>
          </View>

          <Section title="HERE FOR">
            <View style={styles.chipRow}>
              {hereFor.length > 0 ? (
                hereFor.map((intent) => (
                  <Chip key={intent} label={intent} variant="intent" />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Add one to three intents in Settings.
                </Text>
              )}
            </View>
          </Section>

          <Section title="ABOUT">
            <Text style={styles.about}>{about}</Text>
          </Section>

          <Section title={`MODS THIS SEMESTER · ${modules.length}`}>
            <View style={styles.chipRow}>
              {modules.length > 0 ? (
                modules.map((moduleCode) => (
                  <Chip key={moduleCode} label={moduleCode} variant="module" />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Add your current-semester modules in Settings.
                </Text>
              )}
            </View>
          </Section>

          <Section title="SKILLS">
            <View style={styles.chipRow}>
              {profile.skills.length > 0 ? (
                profile.skills.map((skill) => (
                  <Chip key={skill} label={skill} variant="outline" />
                ))
              ) : (
                <Text style={styles.emptyText}>No skills added yet.</Text>
              )}
            </View>
          </Section>

          <Section title="INTERESTS">
            <View style={styles.chipRow}>
              {profile.interests.length > 0 ? (
                profile.interests.map((interest) => (
                  <Chip key={interest} label={interest} variant="outline" />
                ))
              ) : (
                <Text style={styles.emptyText}>No interests added yet.</Text>
              )}
            </View>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#E7EBF7",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  title: {
    color: "#1A1A26",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    height: 42,
    width: 42,
  },
  identityBlock: {
    gap: 14,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    color: "#1A1A26",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  badgePill: {
    backgroundColor: "rgba(18,19,30,0.9)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  identitySub: {
    color: "#6E6E80",
    fontSize: 14,
  },
  headline: {
    color: "#3A3A48",
    fontSize: 15,
    lineHeight: 22.5,
  },
  section: {
    width: "100%",
  },
  sectionInner: {
    gap: 12,
    padding: 18,
  },
  sectionLabel: {
    color: "#7A7A8C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  about: {
    color: "#48485C",
    fontSize: 14,
    lineHeight: 21.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
  intentChip: {
    backgroundColor: "#5B4FE0",
  },
  intentChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  moduleChip: {
    backgroundColor: "#E6EDFB",
    borderColor: "#CBD8F2",
    borderWidth: 1,
  },
  moduleChipText: {
    color: "#3A5FA8",
    fontWeight: "600",
  },
  outlineChip: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "#DADAE2",
    borderWidth: 1,
  },
  outlineChipText: {
    color: "#45455A",
  },
  emptyText: {
    color: "#6E6E80",
    fontSize: 13,
    lineHeight: 18.5,
  },
});
