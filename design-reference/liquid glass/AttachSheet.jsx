/**
 * AttachSheet — Telegram-style attachment picker (bottom sheet).
 * Opened from the composer's attach (paperclip) button in ChatThreadScreen.
 *
 * Options: Photo · Video · File · Audio, plus Poll for group/community chats.
 * Pass `isGroup` to reveal the Poll option. Each option fires onPick(type)
 * and closes; wire onPick to your real pickers (expo-image-picker,
 * expo-document-picker, a poll composer, etc).
 *
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const OPTIONS = [
  { type: "photo", label: "Photo", icon: "image",              colors: ["#5b8def", "#2f6fd6"] },
  { type: "video", label: "Video", icon: "videocam",           colors: ["#f06292", "#d1467c"] },
  { type: "file",  label: "File",  icon: "document-text",      colors: ["#7986cb", "#5561b8"] },
  { type: "audio", label: "Audio", icon: "mic",                colors: ["#ffa726", "#f57c00"] },
  { type: "poll",  label: "Poll",  icon: "stats-chart",        colors: ["#66bb6a", "#43a047"], groupOnly: true },
];

function Option({ opt, onPick }) {
  return (
    <Pressable style={styles.opt} onPress={() => onPick?.(opt.type)}>
      <LinearGradient colors={opt.colors} style={styles.optIcon}>
        <Ionicons name={opt.icon} size={26} color="#fff" />
      </LinearGradient>
      <Text style={styles.optLabel}>{opt.label}</Text>
    </Pressable>
  );
}

export default function AttachSheet({ visible, isGroup, onClose, onPick }) {
  const opts = OPTIONS.filter((o) => !o.groupOnly || isGroup);
  const handlePick = (type) => { onPick?.(type); onClose?.(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.sheet}>
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.6)" }]} />
        <View style={styles.grabber} />
        <View style={styles.grid}>
          {opts.map((o) => (
            <Option key={o.type} opt={o} onPick={handlePick} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28,32,58,0.34)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden",
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.85)",
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(90,110,180,0.28)", alignSelf: "center", marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  opt: { width: "25%", alignItems: "center", marginBottom: 18, gap: 8 },
  optIcon: { width: 60, height: 60, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  optLabel: { fontSize: 12.5, fontWeight: "500", color: "#33333F" },
});
