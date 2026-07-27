/**
 * CreatePollSheet — Liquid-glass poll composer (full-screen modal).
 *
 * Opened when the user taps "Poll" in AttachSheet (group chats only). Its
 * QUESTION field mirrors the poll message bubble's header (glass icon tile +
 * bold question + "Anonymous Poll"), and each OPTION is a rounded glass pill
 * matching the rendered poll. Four settings toggles finish the sheet.
 *
 * State here is local/demo. onSend(poll) returns the composed poll:
 *   { question, options: string[], settings: { publicVotes, multiChoice,
 *     crowdOptions, changeVotes } }
 * Wire it to your chat store to append a real poll message.
 *
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React, { useState } from "react";
import { View, Text, TextInput, Modal, Pressable, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "rgba(91,79,224,0.92)";
const MAX_OPTIONS = 12;

const SETTINGS = [
  { key: "publicVotes",  label: "Public Votes",     sub: "Show voter names on each option",       icon: "eye",             colors: ["#5b8def", "#2f6fd6"] },
  { key: "multiChoice",  label: "Multiple Choice",   sub: "Voters can pick more than one option",   icon: "checkbox",        colors: ["#ffa726", "#f57c00"] },
  { key: "crowdOptions", label: "Crowd Options",     sub: "Members can suggest their own options",  icon: "add-circle",      colors: ["#26c6da", "#0097a7"] },
  { key: "changeVotes",  label: "Changeable Votes",  sub: "Voters can update their choice later",   icon: "sync",            colors: ["#7e6cf5", "#5b4fe0"] },
];

function Toggle({ on }) {
  return (
    <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
      <View style={[styles.knob, { transform: [{ translateX: on ? 18 : 0 }] }]} />
    </View>
  );
}

export default function CreatePollSheet({ visible, onClose, onSend }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([""]);
  const [settings, setSettings] = useState({ publicVotes: true, multiChoice: false, crowdOptions: false, changeVotes: true });

  const setOption = (i, v) => setOptions((o) => o.map((x, k) => (k === i ? v : x)));
  const addOption = () => setOptions((o) => (o.length < MAX_OPTIONS ? [...o, ""] : o));
  const toggle = (k) => setSettings((s) => ({ ...s, [k]: !s[k] }));
  const remaining = MAX_OPTIONS - options.length;

  const send = () => {
    onSend?.({ question, options: options.filter((o) => o.trim()), settings });
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <LinearGradient colors={["#EEF1FC", "#E2E8F8"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }}>
          {/* header */}
          <View style={styles.header}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={19} color="#3a3a48" />
            </Pressable>
            <Text style={styles.title}>New Poll</Text>
            <Pressable style={styles.sendBtn} onPress={send}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* question */}
            <Text style={styles.section}>QUESTION</Text>
            <View style={styles.card}>
              <View style={styles.qRow}>
                <View style={styles.qIcon}>
                  <Ionicons name="stats-chart" size={17} color={ACCENT} />
                </View>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask a question"
                  placeholderTextColor="#8a8a9c"
                  style={styles.qInput}
                />
              </View>
              <Text style={styles.qKicker}>Anonymous Poll</Text>
            </View>

            {/* options */}
            <Text style={styles.section}>OPTIONS</Text>
            <View style={{ gap: 8 }}>
              {options.map((val, i) => (
                <View key={i} style={styles.optPill}>
                  <View style={styles.optNum}>
                    <Text style={styles.optNumText}>{i + 1}</Text>
                  </View>
                  <TextInput
                    value={val}
                    onChangeText={(v) => setOption(i, v)}
                    placeholder="Option"
                    placeholderTextColor="#8a8a9c"
                    style={styles.optInput}
                  />
                </View>
              ))}
              {options.length < MAX_OPTIONS && (
                <Pressable style={styles.addPill} onPress={addOption}>
                  <View style={styles.addIcon}>
                    <Ionicons name="add" size={15} color="#fff" />
                  </View>
                  <Text style={styles.addText}>Add an option</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.remaining}>
              You can add {remaining} more option{remaining === 1 ? "" : "s"}.
            </Text>

            {/* settings */}
            <Text style={styles.section}>SETTINGS</Text>
            <View style={styles.settingsCard}>
              {SETTINGS.map((s, i) => (
                <Pressable
                  key={s.key}
                  style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingDivider]}
                  onPress={() => toggle(s.key)}
                >
                  <LinearGradient colors={s.colors} style={styles.settingIcon}>
                    <Ionicons name={s.icon} size={20} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.settingLabel}>{s.label}</Text>
                    <Text style={styles.settingSub}>{s.sub}</Text>
                  </View>
                  <Toggle on={settings[s.key]} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.62)", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
  title: { fontSize: 16, fontWeight: "700", color: "#1A1A26" },
  sendBtn: { borderRadius: 100, paddingVertical: 9, paddingHorizontal: 20, backgroundColor: "#1c1c28" },
  sendText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  body: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: "#6a6a84", paddingLeft: 4, marginTop: 22, marginBottom: 9 },

  card: { backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", borderRadius: 18, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, gap: 9 },
  qRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  qIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  qInput: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "700", color: "#22222E", padding: 0 },
  qKicker: { fontSize: 12.5, color: "#8a8a9c", paddingLeft: 45 },

  optPill: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", backgroundColor: "rgba(255,255,255,0.55)", paddingVertical: 13, paddingHorizontal: 15 },
  optNum: { width: 22, height: 22, borderRadius: 7, backgroundColor: "rgba(91,79,224,0.14)", alignItems: "center", justifyContent: "center" },
  optNumText: { fontSize: 11, fontWeight: "700", color: "#4230a0" },
  optInput: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: "600", color: "#22222E", padding: 0 },
  addPill: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(91,79,224,0.35)", borderStyle: "dashed", backgroundColor: "rgba(255,255,255,0.32)", paddingVertical: 13, paddingHorizontal: 15 },
  addIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  addText: { fontSize: 15, fontWeight: "600", color: "#4230a0" },
  remaining: { fontSize: 12, color: "#8a8a9c", paddingLeft: 4, marginTop: 9 },

  settingsCard: { backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", borderRadius: 18, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(90,110,180,0.12)" },
  settingIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15, fontWeight: "600", color: "#22222E" },
  settingSub: { fontSize: 12.5, color: "#71718a", lineHeight: 16, marginTop: 2 },

  track: { width: 46, height: 28, borderRadius: 100, borderWidth: 1, justifyContent: "center", paddingHorizontal: 2 },
  trackOn: { backgroundColor: "#5b4fe0", borderColor: "rgba(255,255,255,0.55)" },
  trackOff: { backgroundColor: "rgba(120,130,170,0.3)", borderColor: "rgba(255,255,255,0.7)" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
});
