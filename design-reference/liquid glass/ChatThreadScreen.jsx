/**
 * ChatThreadScreen — Telegram-layout conversation view in Liquid Glass.
 * Glass top bar (Back · name/status · avatar), date separators, incoming
 * (light glass, left) / outgoing (periwinkle, right) bubbles, glass composer.
 * The bottom tab bar is intentionally hidden in-thread (like Telegram).
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import GlassButton from "./GlassButton";
import { CHATS, THREAD_MSGS } from "./chatData";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"];

function Bubble({ msg }) {
  const mine = msg.mine;
  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        { alignSelf: mine ? "flex-end" : "flex-start" },
      ]}
    >
      <Text style={[styles.bubbleText, { color: mine ? "#fff" : "#22222E" }]}>{msg.text}</Text>
      <View style={styles.bubbleMeta}>
        <Text style={[styles.bubbleTime, { color: mine ? "rgba(255,255,255,0.7)" : "#8a8a9c" }]}>{msg.time}</Text>
        {msg.read && <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.85)" />}
      </View>
    </View>
  );
}

export default function ChatThreadScreen({ chatId = "0", onBack }) {
  const chat = CHATS.find((c) => c.id === chatId) || CHATS[0];

  return (
    <View style={styles.root}>
      <LinearGradient colors={APP_GRADIENT} locations={[0, 0.44, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* top bar */}
        <View style={styles.topbar}>
          <GlassButton variant="light" onPress={onBack} style={styles.backBtn}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="chevron-back" size={16} color="#33333F" />
              <Text style={styles.backText}>Back</Text>
            </View>
          </GlassButton>
          <View style={styles.topbarCenter}>
            <Text style={styles.topbarName} numberOfLines={1}>{chat.name}</Text>
            <Text style={styles.topbarSub}>{chat.muted ? "community member chat" : "last seen recently"}</Text>
          </View>
          <LinearGradient colors={chat.avatarBg} style={styles.topAvatar}>
            <Text style={styles.topAvatarText}>{chat.initials}</Text>
          </LinearGradient>
        </View>

        {/* messages */}
        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {THREAD_MSGS.map((m, i) =>
            m.date ? (
              <View key={i} style={styles.dateChip}>
                <Text style={styles.dateChipText}>{m.date}</Text>
              </View>
            ) : (
              <Bubble key={i} msg={m} />
            )
          )}
        </ScrollView>

        {/* composer */}
        <View style={styles.composer}>
          <BlurView intensity={30} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 26 }]} />
          <Ionicons name="attach" size={22} color="#7a7a8c" />
          <TextInput placeholder="Message" placeholderTextColor="#8a8a9c" style={styles.composerInput} />
          <GlassButton variant="dark" style={styles.sendBtn} onPress={() => {}}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </GlassButton>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { paddingLeft: 10, paddingRight: 14, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "500", color: "#33333F" },
  topbarCenter: { flex: 1, alignItems: "center" },
  topbarName: { fontSize: 16, fontWeight: "700", color: "#1A1A26" },
  topbarSub: { fontSize: 12, color: "#7a7a8c" },
  topAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  topAvatarText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  messages: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 90, gap: 8 },
  dateChip: { alignSelf: "center", backgroundColor: "rgba(90,110,180,0.14)", borderRadius: 100, paddingVertical: 4, paddingHorizontal: 12, marginVertical: 6 },
  dateChipText: { fontSize: 11.5, fontWeight: "600", color: "#6E6E80" },
  bubble: { maxWidth: "76%", paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1, shadowColor: "#3240A0", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bubbleMine: { backgroundColor: "rgba(91,79,224,0.92)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 18, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.75)", borderRadius: 18, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 },
  bubbleTime: { fontSize: 10.5 },
  composer: { position: "absolute", left: 12, right: 12, bottom: 14, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 26, paddingVertical: 7, paddingLeft: 14, paddingRight: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.75)" },
  composerInput: { flex: 1, fontSize: 15, color: "#22222E" },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
