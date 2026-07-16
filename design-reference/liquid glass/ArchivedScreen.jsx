/**
 * ArchivedScreen — same list style as ChatsScreen, filtered to archived chats.
 * Tap a row to unarchive. Shows an empty state when nothing is archived.
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "./LiquidGlass";
import GlassButton from "./GlassButton";
import { CHATS } from "./chatData";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"];

export default function ArchivedScreen({ archivedIds = [], onBack, onUnarchive }) {
  const items = CHATS.filter((c) => archivedIds.includes(c.id));

  return (
    <View style={styles.root}>
      <LinearGradient colors={APP_GRADIENT} locations={[0, 0.44, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <GlassButton variant="light" onPress={onBack} style={styles.backBtn}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="chevron-back" size={16} color="#33333F" />
              <Text style={styles.backText}>Chats</Text>
            </View>
          </GlassButton>
          <Text style={styles.title}>Archived</Text>
          <View style={{ width: 74 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {items.length > 0 ? (
            <>
              <GlassSurface tint="light" radius={24} intensity={35}>
                <View style={{ paddingHorizontal: 16 }}>
                  {items.map((c, i) => (
                    <Pressable
                      key={c.id}
                      onPress={() => onUnarchive?.(c.id)}
                      style={[styles.row, i !== items.length - 1 && styles.rowDivider]}
                    >
                      <LinearGradient colors={c.avatarBg} style={styles.avatar}>
                        <Text style={styles.avatarText}>{c.initials}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <View style={styles.rowTop}>
                          <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                          {c.muted && <Ionicons name="volume-mute" size={13} color="#8a8a9c" />}
                          <View style={{ flex: 1 }} />
                          <Text style={styles.time}>{c.time}</Text>
                        </View>
                        <Text style={styles.preview} numberOfLines={2}>{c.preview}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </GlassSurface>
              <Text style={styles.hint}>Tap a chat to unarchive it.</Text>
            </>
          ) : (
            <GlassSurface tint="light" radius={24} intensity={35}>
              <View style={styles.empty}>
                <Ionicons name="file-tray-full-outline" size={34} color="#8a8a9c" />
                <Text style={styles.emptyTitle}>No archived chats</Text>
                <Text style={styles.emptyText}>Chats you archive from the edit menu will show up here.</Text>
              </View>
            </GlassSurface>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, height: 52 },
  backBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "500", color: "#33333F" },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A26" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(90,110,180,0.12)" },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "600", color: "#1A1A26", flexShrink: 1 },
  time: { fontSize: 12.5, color: "#8a8a9c" },
  preview: { fontSize: 13, lineHeight: 18, color: "#6E6E80" },
  hint: { fontSize: 12, color: "#8a8a9c", textAlign: "center", paddingHorizontal: 12 },
  empty: { padding: 44, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#45455A" },
  emptyText: { fontSize: 13, color: "#8a8a9c", textAlign: "center" },
});
