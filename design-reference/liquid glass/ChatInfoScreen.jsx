/**
 * ChatInfoScreen — chat / group info page (opened by tapping the name pill or
 * avatar in ChatThreadScreen).
 *
 * DMs:    actions = Mute · Search · Delete chat    |  tabs = Photos Videos Files Audio Links
 * Groups: actions = Mute · Search · Leave          |  tabs = …Links + Polls
 *
 * There is intentionally NO mobile-number / username block (removed for DMs).
 *
 * Media body: Photos/Videos/Polls render a 3-col thumbnail grid; Files/Audio/
 * Links render a list. All are placeholder/filler — swap for real data.
 *
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GlassButton from "./GlassButton";
import { CHATS, TILE_PALETTE, INFO_LISTS } from "./chatData";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"];
const ACCENT = "#3f57b8";

function Action({ icon, label, danger, onPress }) {
  const color = danger ? "#D2483F" : ACCENT;
  return (
    <GlassButton variant="light" onPress={onPress} style={styles.action}>
      <View style={{ alignItems: "center", gap: 7 }}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      </View>
    </GlassButton>
  );
}

export default function ChatInfoScreen({ chatId = "0", onBack, onMute, onSearch, onDelete, onLeave }) {
  const chat = CHATS.find((c) => c.id === chatId) || CHATS[0];
  const isGroup = !!chat.group;

  const tabs = useMemo(
    () => ["Photos", "Videos", "Files", "Audio", "Links", ...(isGroup ? ["Polls"] : [])],
    [isGroup]
  );
  const [tab, setTab] = useState("Photos");
  const [muted, setMuted] = useState(chat.muted);

  const gridMode = tab === "Photos" || tab === "Videos" || tab === "Polls";
  const list = INFO_LISTS[tab] || [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={APP_GRADIENT} locations={[0, 0.44, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* top */}
          <View style={styles.topbar}>
            <GlassButton variant="light" style={styles.iconBtn} onPress={onBack}>
              <Ionicons name="chevron-back" size={17} color="#33333F" />
            </GlassButton>
            <GlassButton variant="light" label="Edit" onPress={() => {}} textStyle={{ fontSize: 14, color: "#33333F" }} />
          </View>

          {/* identity */}
          <View style={styles.identity}>
            <LinearGradient colors={chat.avatarBg} style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{chat.initials}</Text>
            </LinearGradient>
            <Text style={styles.name}>{chat.name}</Text>
            <Text style={styles.status}>{isGroup ? "community group" : "online"}</Text>
          </View>

          {/* actions */}
          <View style={styles.actions}>
            <Action icon={muted ? "notifications-off-outline" : "notifications-outline"} label={muted ? "Unmute" : "Mute"} onPress={() => { setMuted((m) => !m); onMute?.(chat.id); }} />
            <Action icon="search-outline" label="Search" onPress={() => onSearch?.(chat.id)} />
            {isGroup ? (
              <Action icon="exit-outline" label="Leave" danger onPress={() => onLeave?.(chat.id)} />
            ) : (
              <Action icon="trash-outline" label="Delete" danger onPress={() => onDelete?.(chat.id)} />
            )}
          </View>

          {/* media tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {tabs.map((t) => (
              <GlassButton
                key={t}
                variant={t === tab ? "dark" : "light"}
                label={t}
                onPress={() => setTab(t)}
                style={styles.tab}
                textStyle={{ fontSize: 13.5, fontWeight: "600", color: t === tab ? "#fff" : "#4a5064" }}
              />
            ))}
          </ScrollView>

          {/* body */}
          {gridMode ? (
            <View style={styles.grid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <LinearGradient key={i} colors={TILE_PALETTE[i % TILE_PALETTE.length]} style={styles.tile}>
                  {tab === "Videos" && (
                    <View style={styles.tilePlay}><Ionicons name="play" size={15} color="#fff" /></View>
                  )}
                  {tab === "Polls" && <Ionicons name="stats-chart" size={26} color="rgba(255,255,255,0.9)" />}
                </LinearGradient>
              ))}
            </View>
          ) : (
            <View style={styles.listWrap}>
              {list.map((r, i) => (
                <View key={i} style={styles.listRow}>
                  <LinearGradient colors={r.iconBg} style={styles.listIcon}>
                    <Text style={styles.listExt}>{r.ext}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.listMeta}>{r.meta}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 },
  iconBtn: { width: 40, height: 40 },
  identity: { alignItems: "center", gap: 5, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  bigAvatar: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  bigAvatarText: { color: "#fff", fontSize: 34, fontWeight: "600" },
  name: { fontSize: 23, fontWeight: "700", color: "#1A1A26", marginTop: 6 },
  status: { fontSize: 13.5, color: "#7a7a8c" },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  action: { flex: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 6 },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  tabs: { gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  tab: { borderRadius: 100, paddingVertical: 8, paddingHorizontal: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 4 },
  tile: { width: "32%", aspectRatio: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tilePlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  listWrap: { paddingHorizontal: 16 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(90,110,180,0.12)" },
  listIcon: { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  listExt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  listName: { fontSize: 14, fontWeight: "600", color: "#1A1A26" },
  listMeta: { fontSize: 12, color: "#7a7a8c" },
});
