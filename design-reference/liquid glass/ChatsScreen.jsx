/**
 * ChatsScreen — Telegram-layout chat list in the Liquid Glass aesthetic.
 *
 * Header: Edit (left) · "Chats" title · Archive + Compose (right).
 *
 * Edit mode: selection circles per row + a floating Read/Archive/Delete pill
 *   bar (there is intentionally NO Mute pill here — muting lives on swipe).
 *
 * Swipe a row LEFT (react-native-gesture-handler Swipeable) to reveal
 *   Mute/Unmute · Delete · Archive. Swipe is disabled while in edit mode.
 *
 * Deps (Expo):
 *   expo install expo-blur expo-linear-gradient @expo/vector-icons
 *   expo install react-native-gesture-handler
 *   -> wrap your app root in <GestureHandlerRootView style={{flex:1}}> (see guide)
 */

import React, { useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { GlassSurface } from "./LiquidGlass";
import GlassButton from "./GlassButton";
import BottomNav from "./BottomNav";
import { CHATS } from "./chatData";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"];

function SwipeAction({ colors, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.swipeAction}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.swipeLabel}>{label}</Text>
    </Pressable>
  );
}

function ChatRow({ chat, editing, selected, muted, onPress, isLast, onMute, onDelete, onArchive }) {
  const ref = useRef(null);
  const close = () => ref.current?.close?.();

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <SwipeAction colors={["#ffc061", "#f08a00"]} icon={muted ? "volume-high" : "volume-mute"} label={muted ? "Unmute" : "Mute"} onPress={() => { close(); onMute?.(); }} />
      <SwipeAction colors={["#ff7070", "#e23b3b"]} icon="trash" label="Delete" onPress={() => { close(); onDelete?.(); }} />
      <SwipeAction colors={["#aab2ca", "#7c86a4"]} icon="file-tray-full" label="Archive" onPress={() => { close(); onArchive?.(); }} />
    </View>
  );

  const inner = (
    <Pressable onPress={onPress} style={[styles.row, !isLast && styles.rowDivider]}>
      {editing && (
        <View style={[styles.selCircle, selected && styles.selCircleOn]}>
          {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
      )}
      <LinearGradient colors={chat.avatarBg} style={styles.avatar}>
        <Text style={styles.avatarText}>{chat.initials}</Text>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>{chat.name}</Text>
          {muted && <Ionicons name="volume-mute" size={13} color="#8a8a9c" />}
          <View style={{ flex: 1 }} />
          {chat.read && <Ionicons name="checkmark-done" size={15} color="#4a86d8" />}
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.preview} numberOfLines={2}>{chat.preview}</Text>
          {chat.badge && (
            <View style={[styles.badge, { backgroundColor: muted ? "rgba(120,128,150,0.85)" : "rgba(18,19,30,0.9)" }]}>
              <Text style={styles.badgeText}>{chat.badge}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  // No swipe while editing (selection mode owns the tap/gesture).
  if (editing) return inner;
  return (
    <Swipeable ref={ref} renderRightActions={renderRightActions} overshootRight={false} friction={2} rightThreshold={40}>
      {inner}
    </Swipeable>
  );
}

export default function ChatsScreen({
  onOpenThread,
  onOpenArchived,
  onCompose,
  onTabChange,
  onCreate,
  onArchive,
  onDelete,
  onMute,
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState({});
  const [readIds, setReadIds] = useState({});
  const [hiddenIds, setHiddenIds] = useState({});
  const [mutedIds, setMutedIds] = useState(() =>
    CHATS.reduce((acc, c) => ({ ...acc, [c.id]: c.muted }), {})
  );

  const visible = useMemo(() => CHATS.filter((c) => !hiddenIds[c.id]), [hiddenIds]);
  const selKeys = Object.keys(selected).filter((k) => selected[k]);
  const selCount = selKeys.length;

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const doRead = () => {
    const ids = selCount ? selKeys : visible.map((c) => c.id);
    setReadIds((r) => ids.reduce((acc, id) => ({ ...acc, [id]: true }), { ...r }));
    setSelected({});
  };
  const doArchive = () => {
    if (!selCount) return;
    setHiddenIds((h) => selKeys.reduce((acc, id) => ({ ...acc, [id]: true }), { ...h }));
    onArchive?.(selKeys);
    setSelected({});
  };
  const doDelete = () => {
    if (!selCount) return;
    setHiddenIds((h) => selKeys.reduce((acc, id) => ({ ...acc, [id]: true }), { ...h }));
    onDelete?.(selKeys);
    setSelected({});
  };
  const swipeMute = (id) => { setMutedIds((m) => ({ ...m, [id]: !m[id] })); onMute?.(id); };
  const swipeArchive = (id) => { setHiddenIds((h) => ({ ...h, [id]: true })); onArchive?.([id]); };
  const swipeDelete = (id) => { setHiddenIds((h) => ({ ...h, [id]: true })); onDelete?.([id]); };

  return (
    <View style={styles.root}>
      <LinearGradient colors={APP_GRADIENT} locations={[0, 0.44, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* header */}
        <View style={styles.header}>
          <GlassButton
            variant="light"
            label={editing ? "Done" : "Edit"}
            onPress={() => { setEditing((e) => !e); setSelected({}); }}
            textStyle={{ fontSize: 14, fontWeight: editing ? "700" : "500", color: "#33333F" }}
          />
          <Text style={styles.title}>Chats</Text>
          {editing ? (
            <View style={{ width: 88 }} />
          ) : (
            <View style={styles.headerRight}>
              <GlassButton variant="light" style={styles.iconBtn} onPress={onOpenArchived}>
                <Ionicons name="file-tray-full-outline" size={19} color="#33333F" />
              </GlassButton>
              <GlassButton variant="light" style={styles.iconBtn} onPress={onCompose}>
                <Ionicons name="create-outline" size={19} color="#33333F" />
              </GlassButton>
            </View>
          )}
        </View>

        {/* search */}
        <View style={styles.search}>
          <Ionicons name="search" size={16} color="#8a8a9c" />
          <Text style={styles.searchText}>Search</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassSurface tint="light" radius={24} intensity={35}>
            <View style={{ paddingHorizontal: 16 }}>
              {visible.map((c, i) => (
                <ChatRow
                  key={c.id}
                  chat={{ ...c, read: c.read || !!readIds[c.id], badge: readIds[c.id] ? null : c.badge }}
                  editing={editing}
                  selected={!!selected[c.id]}
                  muted={!!mutedIds[c.id]}
                  isLast={i === visible.length - 1}
                  onPress={() => (editing ? toggle(c.id) : onOpenThread?.(c.id))}
                  onMute={() => swipeMute(c.id)}
                  onDelete={() => swipeDelete(c.id)}
                  onArchive={() => swipeArchive(c.id)}
                />
              ))}
            </View>
          </GlassSurface>
        </ScrollView>

        {/* edit action bar — Read / Archive / Delete (no Mute; muting is on swipe) */}
        {editing && (
          <View style={styles.actionBar}>
            <GlassButton variant="light" label={selCount ? "Read" : "Read All"} onPress={doRead} style={styles.actionPill} textStyle={{ color: "#4238B0" }} />
            <GlassButton variant="light" label="Archive" onPress={doArchive} style={styles.actionPill} textStyle={{ color: selCount ? "#33333F" : "#9a9aa8" }} />
            <GlassButton variant="light" label="Delete" onPress={doDelete} style={styles.actionPill} textStyle={{ color: selCount ? "#D2483F" : "#D9A09B" }} />
          </View>
        )}

        {!editing && <BottomNav active="chats" onChange={onTabChange} onCreate={onCreate} />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, height: 52 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A26" },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40 },
  search: { flexDirection: "row", alignItems: "center", gap: 9, marginHorizontal: 20, marginTop: 8, marginBottom: 4, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", paddingVertical: 11, paddingHorizontal: 16 },
  searchText: { fontSize: 15, color: "#8a8a9c" },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, backgroundColor: "rgba(247,248,253,0.96)" },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(90,110,180,0.12)" },
  selCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "rgba(120,130,170,0.5)", alignItems: "center", justifyContent: "center" },
  selCircleOn: { borderColor: "rgba(91,79,224,0.95)", backgroundColor: "rgba(91,79,224,0.95)" },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "600", color: "#1A1A26", flexShrink: 1 },
  time: { fontSize: 12.5, color: "#8a8a9c" },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  preview: { flex: 1, fontSize: 13, lineHeight: 18, color: "#6E6E80" },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  swipeActions: { flexDirection: "row" },
  swipeAction: { width: 68, alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" },
  swipeLabel: { color: "#fff", fontSize: 11, fontWeight: "600" },
  actionBar: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", gap: 10 },
  actionPill: { flex: 1, height: 56, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
