import { useEffect, useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import type { MeetupSuggestion } from "@appTypes/index";

const ACCENT = "#E64A19";
const MAX_CUSTOM_TIMES = 9;

const COUNTDOWNS = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
] as const;

type CountdownValue = (typeof COUNTDOWNS)[number]["value"];

export type MeetupDraft = {
  title: string;
  options: { label: string; source: "suggested" | "custom" }[];
  countdown: CountdownValue;
};

type Props = {
  visible: boolean;
  suggestions: MeetupSuggestion[];
  isLoadingSuggestions?: boolean;
  helperText?: string | null;
  isCreating?: boolean;
  onClose: () => void;
  onSend: (draft: MeetupDraft) => void;
};

export function CreateMeetupSheet({
  visible,
  suggestions,
  isLoadingSuggestions = false,
  helperText,
  isCreating = false,
  onClose,
  onSend,
}: Props) {
  const [title, setTitle] = useState("");
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [customTimes, setCustomTimes] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<CountdownValue>("6h");

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedSuggestionIds(suggestions.map((suggestion) => suggestion.id));
  }, [suggestions, visible]);

  function resetState() {
    setTitle("");
    setCustomTimes([]);
    setCountdown("6h");
    setSelectedSuggestionIds(suggestions.map((suggestion) => suggestion.id));
  }

  function toggleSuggestion(suggestionId: string) {
    setSelectedSuggestionIds((current) =>
      current.includes(suggestionId)
        ? current.filter((id) => id !== suggestionId)
        : [...current, suggestionId],
    );
  }

  function addCustomTime() {
    setCustomTimes((current) =>
      current.length >= MAX_CUSTOM_TIMES ? current : [...current, ""],
    );
  }

  function updateCustomTime(index: number, value: string) {
    setCustomTimes((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  }

  function removeCustomTime(index: number) {
    setCustomTimes((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  const remainingCustomTimes = MAX_CUSTOM_TIMES - customTimes.length;
  const selectedSuggestedOptions = useMemo(
    () =>
      suggestions
        .filter((suggestion) => selectedSuggestionIds.includes(suggestion.id))
        .map((suggestion) => ({
          label: suggestion.label,
          source: "suggested" as const,
        })),
    [selectedSuggestionIds, suggestions],
  );

  function handleClose() {
    resetState();
    onClose();
  }

  function handleSend() {
    const trimmedTitle = title.trim();
    const customOptions = customTimes
      .map((value) => value.trim())
      .filter(Boolean)
      .map((label) => ({ label, source: "custom" as const }));

    onSend({
      title: trimmedTitle,
      options: [...selectedSuggestedOptions, ...customOptions],
      countdown,
    });
    handleClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <LinearGradient colors={["#EEF1FC", "#E2E8F8"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={19} color="#3A3A48" />
            </Pressable>
            <Text style={styles.headerTitle}>New Meetup</Text>
            <Pressable
              disabled={isCreating}
              style={[styles.sendButton, isCreating ? styles.sendButtonDisabled : null]}
              onPress={handleSend}
            >
              <Text style={styles.sendText}>{isCreating ? "Sending..." : "Send"}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.section}>MEETING TITLE</Text>
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <View style={styles.titleIcon}>
                  <Ionicons name="calendar" size={17} color={ACCENT} />
                </View>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Meeting title"
                  placeholderTextColor="#8A8A9C"
                  style={styles.titleInput}
                />
              </View>
              <Text style={styles.kicker}>Meetup · vote on a time</Text>
            </View>

            <Text style={styles.section}>SUGGESTED TIMES</Text>
            {isLoadingSuggestions ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Checking shared availability</Text>
                <Text style={styles.infoText}>
                  Looking at everyone who uploaded their timetable for the current semester.
                </Text>
              </View>
            ) : suggestions.length > 0 ? (
              <View style={styles.stack}>
                {suggestions.map((suggestion) => {
                  const isSelected = selectedSuggestionIds.includes(suggestion.id);

                  return (
                    <Pressable
                      key={suggestion.id}
                      style={[
                        styles.suggestionRow,
                        isSelected ? styles.suggestionRowOn : styles.suggestionRowOff,
                      ]}
                      onPress={() => toggleSuggestion(suggestion.id)}
                    >
                      <View
                        style={[
                          styles.check,
                          isSelected ? styles.checkOn : styles.checkOff,
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <View style={styles.flexOne}>
                        <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                        <Text style={styles.suggestionSub}>
                          {suggestion.sub} · {suggestion.coverage.included_participants}/
                          {suggestion.coverage.total_participants} included
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>No overlap suggestions yet</Text>
                <Text style={styles.infoText}>
                  {helperText ??
                    "Too few members uploaded timetables for the current semester. You can still add custom time options below."}
                </Text>
              </View>
            )}

            <Text style={styles.section}>CUSTOM TIMES</Text>
            <View style={styles.stack}>
              {customTimes.map((value, index) => (
                <View key={`meetup-custom-${index}`} style={styles.optionRow}>
                  <View style={styles.optionNumber}>
                    <Text style={styles.optionNumberText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    value={value}
                    onChangeText={(nextValue) => updateCustomTime(index, nextValue)}
                    placeholder="e.g. Sat, 18 Jul, 3:00 PM"
                    placeholderTextColor="#8A8A9C"
                    style={styles.optionInput}
                  />
                  <Pressable style={styles.removeButton} onPress={() => removeCustomTime(index)}>
                    <Ionicons name="close" size={14} color="#A4390F" />
                  </Pressable>
                </View>
              ))}

              {customTimes.length < MAX_CUSTOM_TIMES ? (
                <Pressable style={styles.addRow} onPress={addCustomTime}>
                  <View style={styles.addIcon}>
                    <Ionicons name="add" size={15} color="#FFFFFF" />
                  </View>
                  <Text style={styles.addText}>Add a custom time</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.remaining}>
              You can add {remainingCustomTimes} more custom time
              {remainingCustomTimes === 1 ? "" : "s"}.
            </Text>

            <Text style={styles.section}>VOTING CLOSES IN</Text>
            <View style={styles.countdownRow}>
              {COUNTDOWNS.map((item) => {
                const isSelected = countdown === item.value;

                return (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.countdownChip,
                      isSelected ? styles.countdownChipOn : null,
                    ]}
                    onPress={() => setCountdown(item.value)}
                  >
                    <Text
                      style={[
                        styles.countdownText,
                        isSelected ? styles.countdownTextOn : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
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
  headerTitle: { color: "#1A1A26", fontSize: 16, fontWeight: "700" },
  sendButton: {
    backgroundColor: "#1C1C28",
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  body: { paddingBottom: 48, paddingHorizontal: 16, paddingTop: 4 },
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
    gap: 9,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 11 },
  titleIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 11,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  titleInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    minWidth: 0,
    padding: 0,
  },
  kicker: { color: "#8A8A9C", fontSize: 12.5, paddingLeft: 45 },
  stack: { gap: 8 },
  suggestionRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  suggestionRowOn: {
    backgroundColor: "rgba(230,74,25,0.10)",
    borderColor: "rgba(230,74,25,0.4)",
  },
  suggestionRowOff: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
  },
  check: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkOff: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(120,130,170,0.4)",
  },
  flexOne: { flex: 1, minWidth: 0 },
  suggestionLabel: { color: "#22222E", fontSize: 15, fontWeight: "600" },
  suggestionSub: { color: "#7A7A8C", fontSize: 12, marginTop: 1 },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  infoTitle: { color: "#22222E", fontSize: 15, fontWeight: "700" },
  infoText: { color: "#7A7A8C", fontSize: 13, lineHeight: 18 },
  optionRow: {
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
    backgroundColor: "rgba(230,74,25,0.14)",
    borderRadius: 7,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  optionNumberText: { color: "#A4390F", fontSize: 11, fontWeight: "700" },
  optionInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    minWidth: 0,
    padding: 0,
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "rgba(230,74,25,0.08)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  addRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.32)",
    borderColor: "rgba(230,74,25,0.35)",
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
  addText: { color: "#A4390F", fontSize: 15, fontWeight: "600" },
  remaining: { color: "#8A8A9C", fontSize: 12, marginTop: 9, paddingLeft: 4 },
  countdownRow: { flexDirection: "row", gap: 8 },
  countdownChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 100,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  countdownChipOn: { backgroundColor: "#1C1C28", borderColor: "#1C1C28" },
  countdownText: { color: "#1C1C28", fontSize: 13, fontWeight: "600" },
  countdownTextOn: { color: "#FFFFFF" },
});
