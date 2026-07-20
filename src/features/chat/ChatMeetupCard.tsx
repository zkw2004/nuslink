import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ChatMeetup } from "@appTypes/index";

type Props = {
  meetup: ChatMeetup;
  disabled?: boolean;
  isDark?: boolean;
  onVote: (optionId: string) => void;
  onUnvote?: () => void;
};

function formatMeetupStatus(meetup: ChatMeetup) {
  if (meetup.status === "closed_confirmed") {
    return "Meetup · Confirmed";
  }

  if (meetup.status === "closed_tie") {
    return "Meetup · Closed with no winner";
  }

  const closesAt = new Date(meetup.closes_at);
  const now = new Date();
  const diffMs = closesAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Meetup · Closing soon";
  }

  const totalMinutes = Math.round(diffMs / 60000);

  if (totalMinutes < 60) {
    return `Meetup · Closes in ${totalMinutes}m`;
  }

  const totalHours = Math.round(totalMinutes / 60);

  if (totalHours < 24) {
    return `Meetup · Closes in ${totalHours}h`;
  }

  const totalDays = Math.round(totalHours / 24);
  return `Meetup · Closes in ${totalDays}d`;
}

export function ChatMeetupCard({
  meetup,
  disabled = false,
  isDark = false,
  onVote,
  onUnvote,
}: Props) {
  const hasCurrentUserVote = meetup.options.some(
    (option) => option.is_selected_by_current_user,
  );
  const glassBase = isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)";
  const glassBorder = isDark ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.85)";
  const fill = isDark ? "rgba(255,255,255,0.24)" : "rgba(230,74,25,0.18)";
  const textColor = isDark ? "#FFFFFF" : "#22222E";
  const subColor = isDark ? "rgba(255,255,255,0.72)" : "#8A8A9C";
  const accentColor = isDark ? "#FFFFFF" : "#B53E16";

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View
          style={[
            styles.icon,
            { backgroundColor: glassBase, borderColor: glassBorder },
          ]}
        >
          <Ionicons
            name="calendar"
            size={15}
            color={isDark ? "#FFFFFF" : "rgba(230,74,25,0.95)"}
          />
        </View>
        <Text style={[styles.title, { color: textColor }]}>{meetup.title}</Text>
      </View>
      <Text style={[styles.kicker, { color: subColor }]}>
        {formatMeetupStatus(meetup)}
      </Text>

      <View style={styles.options}>
        {meetup.options.map((option) => {
          const percentage =
            meetup.total_votes > 0
              ? Math.round((option.vote_count / meetup.total_votes) * 100)
              : 0;

          return (
            <Pressable
              key={option.id}
              disabled={disabled || meetup.status !== "open"}
              onPress={() => onVote(option.id)}
              style={[
                styles.option,
                {
                  backgroundColor: option.is_winner
                    ? isDark
                      ? "rgba(67,160,71,0.34)"
                      : "rgba(67,160,71,0.18)"
                    : glassBase,
                  borderColor: option.is_winner
                    ? "rgba(67,160,71,0.82)"
                    : option.is_selected_by_current_user
                      ? accentColor
                      : glassBorder,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.fill,
                  {
                    backgroundColor: option.is_winner
                      ? "rgba(67,160,71,0.22)"
                      : fill,
                    right: `${100 - Math.min(100, Math.max(0, percentage))}%`,
                  },
                ]}
              />
              <Text
                numberOfLines={2}
                style={[styles.optionLabel, { color: textColor }]}
              >
                {option.label}
              </Text>
              <View style={styles.optionMeta}>
                {option.is_winner ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={isDark ? "#E7FFE9" : "#2E7D32"}
                  />
                ) : null}
                <Text
                  style={[
                    styles.optionPct,
                    { color: option.is_winner ? "#2E7D32" : accentColor },
                  ]}
                >
                  {percentage}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.votes, { color: subColor }]}>
          {meetup.total_votes} vote{meetup.total_votes === 1 ? "" : "s"}
        </Text>

        {meetup.status === "open" && hasCurrentUserVote && onUnvote ? (
          <Pressable
            disabled={disabled}
            onPress={onUnvote}
            style={[styles.unvote, { backgroundColor: glassBase }]}
          >
            <Text style={[styles.unvoteText, { color: subColor }]}>Unvote</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, maxWidth: "100%", width: 272 },
  head: { alignItems: "center", flexDirection: "row", gap: 9 },
  icon: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  kicker: { fontSize: 11.5, marginBottom: 2, marginTop: -2 },
  options: { gap: 8 },
  option: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 11,
    position: "relative",
  },
  fill: {
    borderRadius: 13,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  optionMeta: { alignItems: "center", flexDirection: "row", gap: 4 },
  optionPct: { fontSize: 13.5, fontWeight: "700" },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  votes: { fontSize: 11.5 },
  unvote: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unvoteText: { fontSize: 11.5, fontWeight: "600" },
});
