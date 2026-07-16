import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { SectionCard } from "@components/shared";
import type { ChatPinnedMessage, ChatPoll } from "@appTypes/index";

export type PinnedMessagePreview = ChatPinnedMessage & {
  body: string;
  senderName: string;
};

type ChatPollCardProps = {
  poll: ChatPoll;
  disabled?: boolean;
  isDark?: boolean;
  onVote: (optionId: string) => void;
  onUnvote?: () => void;
};

type PollComposerProps = {
  question: string;
  options: string[];
  isCreating: boolean;
  onQuestionChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

type PinnedMessagesDrawerProps = {
  pinnedMessages: PinnedMessagePreview[];
  onUnpin: (messageId: string) => void;
};

const ACCENT = "rgba(91,79,224,0.92)";
const MAX_POLL_OPTIONS = 12;
const POLL_SETTINGS = [
  {
    key: "publicVotes",
    label: "Public Votes",
    sub: "Show voter names on each option",
    icon: "eye",
    colors: ["#5B8DEF", "#2F6FD6"] as const,
  },
  {
    key: "multiChoice",
    label: "Multiple Choice",
    sub: "Voters can pick more than one option",
    icon: "checkbox",
    colors: ["#FFA726", "#F57C00"] as const,
  },
  {
    key: "crowdOptions",
    label: "Crowd Options",
    sub: "Members can suggest their own options",
    icon: "add-circle",
    colors: ["#26C6DA", "#0097A7"] as const,
  },
  {
    key: "changeVotes",
    label: "Changeable Votes",
    sub: "Voters can update their choice later",
    icon: "sync",
    colors: ["#7E6CF5", "#5B4FE0"] as const,
  },
] satisfies {
  key: keyof PollSettings;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string];
}[];

type PollSettings = {
  publicVotes: boolean;
  multiChoice: boolean;
  crowdOptions: boolean;
  changeVotes: boolean;
};

export function ChatPollCard({
  poll,
  disabled = false,
  isDark = false,
  onVote,
  onUnvote,
}: ChatPollCardProps) {
  const hasCurrentUserVote = poll.options.some(
    (option) => option.is_selected_by_current_user,
  );
  const glassBase = isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)";
  const glassBorder = isDark ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.85)";
  const fill = isDark ? "rgba(255,255,255,0.34)" : "rgba(91,79,224,0.20)";
  const textColor = isDark ? "#FFFFFF" : "#22222E";
  const timeColor = isDark ? "rgba(255,255,255,0.72)" : "#8A8A9C";
  const pctColor = isDark ? "#FFFFFF" : "#4230A0";

  return (
    <View style={pollStyles.wrap}>
      <View style={pollStyles.head}>
        <View
          style={[
            pollStyles.icon,
            { backgroundColor: glassBase, borderColor: glassBorder },
          ]}
        >
          <Ionicons
            name="stats-chart"
            size={15}
            color={isDark ? "#FFFFFF" : "rgba(91,79,224,0.92)"}
          />
        </View>
        <Text style={[pollStyles.question, { color: textColor }]}>
          {poll.question}
        </Text>
      </View>
      <Text style={[pollStyles.kicker, { color: timeColor }]}>Anonymous Poll</Text>

      <View style={pollStyles.options}>
        {poll.options.map((option) => {
          const percentage =
            poll.total_votes > 0
              ? Math.round((option.vote_count / poll.total_votes) * 100)
              : 0;
          const clampedPercentage = Math.min(100, Math.max(0, percentage));

          return (
            <Pressable
              key={option.id}
              disabled={disabled}
              onPress={() => onVote(option.id)}
              style={[
                pollStyles.option,
                {
                  backgroundColor: glassBase,
                  borderColor: option.is_selected_by_current_user
                    ? pctColor
                    : glassBorder,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  pollStyles.fill,
                  {
                    backgroundColor: fill,
                    right: `${100 - clampedPercentage}%`,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[pollStyles.optionLabel, { color: textColor }]}
              >
                {option.body}
              </Text>
              <Text style={[pollStyles.optionPct, { color: pctColor }]}>
                {percentage}%
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={pollStyles.footer}>
        <Text style={[pollStyles.votes, { color: timeColor }]}>
          {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
        </Text>

        {hasCurrentUserVote && onUnvote ? (
          <Pressable
            disabled={disabled}
            onPress={onUnvote}
            style={[pollStyles.unvote, { backgroundColor: glassBase }]}
          >
            <Text style={[pollStyles.unvoteText, { color: timeColor }]}>
              Unvote
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const pollStyles = StyleSheet.create({
  wrap: {
    gap: 8,
    maxWidth: "100%",
    width: 264,
  },
  head: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  icon: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  kicker: {
    fontSize: 11.5,
    marginBottom: 2,
    marginTop: -2,
  },
  options: {
    gap: 8,
  },
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
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  optionPct: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 1,
  },
  votes: {
    fontSize: 11.5,
  },
  unvote: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unvoteText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export function PollComposer({
  question,
  options,
  isCreating,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCancel,
  onSubmit,
}: PollComposerProps) {
  const [settings, setSettings] = useState<PollSettings>({
    publicVotes: true,
    multiChoice: false,
    crowdOptions: false,
    changeVotes: true,
  });
  const remaining = MAX_POLL_OPTIONS - options.length;

  function toggleSetting(key: keyof PollSettings) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={createPollStyles.root}>
        <LinearGradient
          colors={["#EEF1FC", "#E2E8F8"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={createPollStyles.safeArea}>
          <View style={createPollStyles.header}>
            <Pressable style={createPollStyles.closeButton} onPress={onCancel}>
              <Ionicons name="close" size={19} color="#3A3A48" />
            </Pressable>
            <Text style={createPollStyles.title}>New Poll</Text>
            <Pressable
              disabled={isCreating}
              style={[
                createPollStyles.sendButton,
                isCreating ? createPollStyles.sendButtonDisabled : null,
              ]}
              onPress={onSubmit}
            >
              <Text style={createPollStyles.sendText}>
                {isCreating ? "Sending" : "Send"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={createPollStyles.body}
          >
            <Text style={createPollStyles.section}>QUESTION</Text>
            <View style={createPollStyles.card}>
              <View style={createPollStyles.questionRow}>
                <View style={createPollStyles.questionIcon}>
                  <Ionicons name="stats-chart" size={17} color={ACCENT} />
                </View>
                <TextInput
                  value={question}
                  onChangeText={onQuestionChange}
                  placeholder="Ask a question"
                  placeholderTextColor="#8A8A9C"
                  style={createPollStyles.questionInput}
                />
              </View>
            </View>

            <Text style={createPollStyles.section}>OPTIONS</Text>
            <View style={createPollStyles.options}>
              {options.map((option, index) => (
                <View key={`poll-option-${index}`} style={createPollStyles.optionPill}>
                  <View style={createPollStyles.optionNumber}>
                    <Text style={createPollStyles.optionNumberText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    value={option}
                    onChangeText={(value) => onOptionChange(index, value)}
                    placeholder="Option"
                    placeholderTextColor="#8A8A9C"
                    style={createPollStyles.optionInput}
                  />
                  {options.length > 1 ? (
                    <Pressable
                      onPress={() => onRemoveOption(index)}
                      style={createPollStyles.removeOption}
                    >
                      <Ionicons name="close" size={14} color="#6A6A84" />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {options.length < MAX_POLL_OPTIONS ? (
                <Pressable style={createPollStyles.addPill} onPress={onAddOption}>
                  <View style={createPollStyles.addIcon}>
                    <Ionicons name="add" size={15} color="#FFFFFF" />
                  </View>
                  <Text style={createPollStyles.addText}>Add an option</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={createPollStyles.remaining}>
              You can add {remaining} more option{remaining === 1 ? "" : "s"}.
            </Text>

            <Text style={createPollStyles.section}>SETTINGS</Text>
            <View style={createPollStyles.settingsCard}>
              {POLL_SETTINGS.map((setting, index) => (
                <Pressable
                  key={setting.key}
                  style={[
                    createPollStyles.settingRow,
                    index < POLL_SETTINGS.length - 1
                      ? createPollStyles.settingDivider
                      : null,
                  ]}
                  onPress={() => toggleSetting(setting.key)}
                >
                  <LinearGradient
                    colors={setting.colors}
                    style={createPollStyles.settingIcon}
                  >
                    <Ionicons name={setting.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={createPollStyles.settingCopy}>
                    <Text style={createPollStyles.settingLabel}>{setting.label}</Text>
                    <Text style={createPollStyles.settingSub}>{setting.sub}</Text>
                  </View>
                  <View
                    style={[
                      createPollStyles.track,
                      settings[setting.key]
                        ? createPollStyles.trackOn
                        : createPollStyles.trackOff,
                    ]}
                  >
                    <View
                      style={[
                        createPollStyles.knob,
                        {
                          transform: [
                            { translateX: settings[setting.key] ? 18 : 0 },
                          ],
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createPollStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: "#1A1A26",
    fontSize: 16,
    fontWeight: "700",
  },
  sendButton: {
    backgroundColor: "#1C1C28",
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  section: {
    color: "#6A6A84",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 9,
    marginTop: 22,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  questionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  questionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 11,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  questionInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    minWidth: 0,
    padding: 0,
  },
  options: {
    gap: 8,
  },
  optionPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  optionNumber: {
    alignItems: "center",
    backgroundColor: "rgba(91,79,224,0.14)",
    borderRadius: 7,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  optionNumberText: {
    color: "#4230A0",
    fontSize: 11,
    fontWeight: "700",
  },
  optionInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    minWidth: 0,
    padding: 0,
  },
  removeOption: {
    alignItems: "center",
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  addPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.32)",
    borderColor: "rgba(91,79,224,0.35)",
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  addIcon: {
    alignItems: "center",
    backgroundColor: ACCENT,
    borderRadius: 7,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  addText: {
    color: "#4230A0",
    fontSize: 15,
    fontWeight: "600",
  },
  remaining: {
    color: "#8A8A9C",
    fontSize: 12,
    marginTop: 9,
    paddingLeft: 4,
  },
  settingsCard: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingDivider: {
    borderBottomColor: "rgba(90,110,180,0.12)",
    borderBottomWidth: 1,
  },
  settingIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  settingCopy: {
    flex: 1,
    minWidth: 0,
  },
  settingLabel: {
    color: "#22222E",
    fontSize: 15,
    fontWeight: "600",
  },
  settingSub: {
    color: "#71718A",
    fontSize: 12.5,
    lineHeight: 16,
    marginTop: 2,
  },
  track: {
    borderRadius: 100,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 2,
    width: 46,
  },
  trackOn: {
    backgroundColor: "#5B4FE0",
    borderColor: "rgba(255,255,255,0.55)",
  },
  trackOff: {
    backgroundColor: "rgba(120,130,170,0.3)",
    borderColor: "rgba(255,255,255,0.7)",
  },
  knob: {
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    height: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    width: 22,
  },
});

export function PinnedMessagesDrawer({
  pinnedMessages,
  onUnpin,
}: PinnedMessagesDrawerProps) {
  const title = useMemo(() => {
    if (pinnedMessages.length === 0) {
      return "Pinned messages";
    }

    return `${pinnedMessages.length} pinned message${
      pinnedMessages.length === 1 ? "" : "s"
    }`;
  }, [pinnedMessages.length]);

  return (
    <SectionCard className="mx-5 mb-4">
      <Text className="text-[15px] font-bold text-[#0F1115]">{title}</Text>
      {pinnedMessages.length === 0 ? (
        <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
          Pin useful decisions, links, and polls from the message actions.
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {pinnedMessages.map((message) => (
            <View
              key={message.id}
              className="rounded-[14px] border border-[#E4E9F1] bg-[#F7F9FC] p-3"
            >
              <Text className="text-[12px] font-semibold text-[#7B8494]">
                {message.senderName}
              </Text>
              <Text className="mt-1 text-[14px] leading-6 text-[#0F1115]">
                {message.body}
              </Text>
              <Pressable
                onPress={() => onUnpin(message.message_id)}
                className="mt-3 self-start rounded-full bg-white px-3 py-2"
              >
                <Text className="text-[12px] font-semibold text-[#0F1115]">
                  Unpin
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
