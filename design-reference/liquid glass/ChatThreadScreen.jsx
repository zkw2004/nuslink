/**
 * ChatThreadScreen — Telegram-layout conversation in Liquid Glass.
 *
 * Features:
 *  - Glass top bar. The name/status is a tappable glass PILL -> onOpenInfo().
 *  - Bubbles: text, image, video, file, voice (audio) and group Polls,
 *    built from chatData.buildThread(chat).
 *  - Long-press a bubble -> BubbleMenu: a reaction row + Reply / Copy /
 *    Edit (own messages only) / Pin / Forward / Delete / Select.
 *  - Pin -> a small "Pin for everyone / Pin for me" prompt, then a pinned
 *    banner at the top of the thread with an ✕ to unpin.
 *  - Composer attach (paperclip) -> AttachSheet (Poll only for groups).
 *
 * State here is local/demo. Replace the handlers (onReply, onPin, reactions…)
 * with your real chat store. Deps (Expo):
 *   expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Modal, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import GlassButton from "./GlassButton";
import AttachSheet from "./AttachSheet";
import { CHATS, buildThread, REACTIONS } from "./chatData";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"];
const ACCENT = "rgba(91,79,224,0.92)";

/* ------------------------------ bubbles ------------------------------ */

function Caption({ text, color }) {
  if (!text) return null;
  return <Text style={[styles.caption, { color }]}>{text}</Text>;
}

function MediaBody({ msg, mine }) {
  const timeColor = mine ? "rgba(255,255,255,0.72)" : "#8a8a9c";
  const textColor = mine ? "#fff" : "#22222E";

  if (msg.kind === "image") {
    return (
      <View style={styles.mediaWrap}>
        <LinearGradient colors={["#c3cbe6", "#9aa6cf"]} style={styles.mediaBox}>
          <Ionicons name="image" size={34} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
        <Caption text={msg.caption} color={textColor} />
      </View>
    );
  }
  if (msg.kind === "video") {
    return (
      <View style={styles.mediaWrap}>
        <LinearGradient colors={["#8b93b8", "#5a6390"]} style={styles.mediaBox}>
          <View style={styles.playCircle}><Ionicons name="play" size={20} color="#fff" /></View>
          <View style={styles.durChip}><Text style={styles.durChipText}>{msg.dur}</Text></View>
        </LinearGradient>
        <Caption text={msg.caption} color={textColor} />
      </View>
    );
  }
  if (msg.kind === "file") {
    return (
      <View style={styles.fileRow}>
        <LinearGradient colors={["#7986cb", "#5561b8"]} style={styles.fileIcon}>
          <Ionicons name="document-text" size={21} color="#fff" />
        </LinearGradient>
        <View style={styles.fileText}>
          <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{msg.fileName}</Text>
          <Text style={[styles.fileMeta, { color: timeColor }]} numberOfLines={1}>{msg.fileSize}</Text>
        </View>
      </View>
    );
  }
  if (msg.kind === "audio") {
    const wave = mine ? "rgba(255,255,255,0.6)" : "rgba(91,79,224,0.5)";
    const bars = [8, 15, 21, 11, 17, 9, 19, 13, 22, 10, 16, 7, 14, 20];
    return (
      <View style={styles.audioRow}>
        <View style={[styles.audioBtn, { backgroundColor: mine ? "rgba(255,255,255,0.25)" : ACCENT }]}>
          <Ionicons name="play" size={15} color="#fff" />
        </View>
        <View style={styles.wave}>
          {bars.map((h, i) => (
            <View key={i} style={{ width: 2, height: h, borderRadius: 1, backgroundColor: wave }} />
          ))}
        </View>
        <Text style={[styles.audioDur, { color: timeColor }]} numberOfLines={1}>{msg.dur}</Text>
      </View>
    );
  }
  if (msg.kind === "poll") {
    const glassBase = mine ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)";
    const glassBorder = mine ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.85)";
    const fill = mine ? "rgba(255,255,255,0.34)" : "rgba(91,79,224,0.20)";
    const pctColor = mine ? "#fff" : "#4230a0";
    return (
      <View style={styles.pollWrap}>
        <View style={styles.pollHead}>
          <View style={[styles.pollIcon, { backgroundColor: glassBase, borderColor: glassBorder }]}>
            <Ionicons name="stats-chart" size={15} color={mine ? "#fff" : ACCENT} />
          </View>
          <Text style={[styles.pollQ, { color: textColor }]}>{msg.question}</Text>
        </View>
        <Text style={[styles.pollKicker, { color: timeColor }]}>Anonymous Poll</Text>
        <View style={{ gap: 8 }}>
          {msg.options.map((o, i) => (
            <View key={i} style={[styles.pollOpt, { backgroundColor: glassBase, borderColor: glassBorder }]}>
              <View style={[styles.pollFill, { width: `${o.pct}%`, backgroundColor: fill }]} />
              <Text style={[styles.pollOptLabel, { color: textColor }]} numberOfLines={1}>{o.label}</Text>
              <Text style={[styles.pollOptPct, { color: pctColor }]}>{o.pct}%</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.pollVotes, { color: timeColor }]}>{msg.votes}</Text>
      </View>
    );
  }
  return null;
}

function Bubble({ msg, index, isGroup, reaction, onLongPress }) {
  const mine = msg.mine;
  const isText = !msg.kind || msg.kind === "text";
  const isMedia = msg.kind === "image" || msg.kind === "video";
  const isPoll = msg.kind === "poll";
  const showSender = isGroup && !mine && !!msg.sender;
  const rc = reaction || (msg.reaction ? { emoji: msg.reaction, count: msg.reactCount || 1 } : null);

  return (
    <Pressable
      onLongPress={() => onLongPress?.(index, mine)}
      delayLongPress={320}
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        isMedia && styles.bubbleMedia,
        isPoll && { maxWidth: 300 },
        { alignSelf: mine ? "flex-end" : "flex-start" },
      ]}
    >
      {showSender && <Text style={styles.sender}>{msg.sender}</Text>}
      {isText ? (
        <Text style={[styles.bubbleText, { color: mine ? "#fff" : "#22222E" }]}>{msg.text}</Text>
      ) : (
        <MediaBody msg={msg} mine={mine} />
      )}
      {rc && (
        <View style={[styles.reactChip, { backgroundColor: mine ? "rgba(255,255,255,0.22)" : "rgba(91,79,224,0.14)" }, isMedia && { marginLeft: 6 }]}>
          <Text style={{ fontSize: 12 }}>{rc.emoji}</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: mine ? "#fff" : "#4230a0" }}>{rc.count}</Text>
        </View>
      )}
      <View style={[styles.bubbleMeta, isMedia && { paddingHorizontal: 6, paddingBottom: 2 }]}>
        <Text style={[styles.bubbleTime, { color: mine ? "rgba(255,255,255,0.7)" : "#8a8a9c" }]}>{msg.time}</Text>
        {msg.read && <Ionicons name="checkmark-done" size={13} color={mine ? "rgba(255,255,255,0.85)" : "#4a86d8"} />}
      </View>
    </Pressable>
  );
}

/* ---------------------------- bubble menu ---------------------------- */

const MENU_ITEMS = [
  { key: "reply", label: "Reply", icon: "arrow-undo-outline" },
  { key: "copy", label: "Copy", icon: "copy-outline" },
  { key: "edit", label: "Edit", icon: "create-outline", mineOnly: true },
  { key: "pin", label: "Pin", icon: "bookmark-outline" },
  { key: "forward", label: "Forward", icon: "arrow-redo-outline" },
  { key: "delete", label: "Delete", icon: "trash-outline", danger: true },
];

function BubbleMenu({ target, previewText, onAction, onReact, onClose }) {
  if (!target) return null;
  const mine = target.mine;
  const items = MENU_ITEMS.filter((it) => !it.mineOnly || mine);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View pointerEvents="box-none" style={[styles.menuWrap, { alignItems: mine ? "flex-end" : "flex-start" }]}>
        {/* reactions */}
        <View style={styles.reactBar}>
          {REACTIONS.map((e) => (
            <Pressable key={e} onPress={() => onReact?.(e)} style={styles.reactBtn}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
        {/* echoed bubble */}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, { maxWidth: "76%" }]}>
          <Text style={[styles.bubbleText, { color: mine ? "#fff" : "#22222E" }]}>{previewText}</Text>
        </View>
        {/* menu */}
        <View style={styles.menuCard}>
          <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
          {items.map((it, i) => (
            <React.Fragment key={it.key}>
              {it.key === "select" && <View style={styles.menuDivider} />}
              <Pressable style={styles.menuItem} onPress={() => onAction?.(it.key)}>
                <Ionicons name={it.icon} size={21} color={it.danger ? "#D2483F" : "#33333F"} />
                <Text style={[styles.menuLabel, it.danger && { color: "#D2483F" }]}>{it.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
          <View style={styles.menuDivider} />
          <Pressable style={styles.menuItem} onPress={() => onAction?.("select")}>
            <Ionicons name="checkmark-circle-outline" size={21} color="#33333F" />
            <Text style={styles.menuLabel}>Select</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------------------- pin prompt ----------------------------- */

function PinPrompt({ chat, onConfirm, onCancel }) {
  const both = chat.group ? "Pin for everyone" : `Pin for me and ${(chat.name || "").split(" ")[0]}`;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.pinBackdrop} onPress={onCancel}>
        <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View pointerEvents="box-none" style={styles.pinWrap}>
        <View style={styles.pinCard}>
          <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.78)" }]} />
          <Text style={styles.pinTitle}>Pin this message?</Text>
          <Pressable style={styles.pinBtn} onPress={onConfirm}><Text style={[styles.pinBtnText, { color: "#4230a0" }]}>{both}</Text></Pressable>
          <Pressable style={styles.pinBtn} onPress={onConfirm}><Text style={[styles.pinBtnText, { color: "#33333F" }]}>Pin for me</Text></Pressable>
          <Pressable style={styles.pinBtn} onPress={onCancel}><Text style={[styles.pinBtnText, { color: "#8a8a9c", fontWeight: "400" }]}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------ screen ------------------------------- */

export default function ChatThreadScreen({ chatId = "0", onBack, onOpenInfo }) {
  const chat = CHATS.find((c) => c.id === chatId) || CHATS[0];
  const messages = useMemo(() => buildThread(chat), [chat]);

  const [reactions, setReactions] = useState({});     // {msgIndex: emoji}
  const [menuTarget, setMenuTarget] = useState(null);  // {index, mine}
  const [pinPending, setPinPending] = useState(false);
  const [pinnedText, setPinnedText] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);

  const previewOf = (i) => {
    const m = messages[i];
    if (!m) return "";
    if (m.text) return m.text;
    return { image: "Photo", video: "Video", file: m.fileName || "File", audio: "Voice message", poll: m.question || "Poll" }[m.kind] || "";
  };

  const handleAction = (key) => {
    const t = menuTarget;
    if (key === "pin") { setMenuTarget(null); setPinPending(t.index); return; }
    // reply / copy / edit / forward / delete / select -> wire to your store
    setMenuTarget(null);
  };

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
          <GlassButton variant="light" onPress={() => onOpenInfo?.(chat.id)} style={styles.namePill}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.topbarName} numberOfLines={1}>{chat.name}</Text>
              <Text style={styles.topbarSub}>{chat.group ? "community group" : "last seen recently"}</Text>
            </View>
          </GlassButton>
          <Pressable onPress={() => onOpenInfo?.(chat.id)}>
            <LinearGradient colors={chat.avatarBg} style={styles.topAvatar}>
              <Text style={styles.topAvatarText}>{chat.initials}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* pinned banner */}
        {pinnedText && (
          <View style={styles.pinnedBanner}>
            <View style={styles.pinnedAccent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pinnedLabel}>Pinned Message</Text>
              <Text style={styles.pinnedText} numberOfLines={1}>{pinnedText}</Text>
            </View>
            <Pressable onPress={() => setPinnedText(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#7a7a8c" />
            </Pressable>
          </View>
        )}

        {/* messages */}
        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {messages.map((m, i) =>
            m.date ? (
              <View key={i} style={styles.dateChip}><Text style={styles.dateChipText}>{m.date}</Text></View>
            ) : (
              <Bubble
                key={i}
                msg={m}
                index={i}
                isGroup={chat.group}
                reaction={reactions[i] ? { emoji: reactions[i], count: 1 } : null}
                onLongPress={(index, mine) => setMenuTarget({ index, mine })}
              />
            )
          )}
        </ScrollView>

        {/* composer */}
        <View style={styles.composer}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 26 }]} />
          <Pressable onPress={() => setAttachOpen(true)} hitSlop={8}>
            <Ionicons name="attach" size={22} color="#7a7a8c" />
          </Pressable>
          <TextInput placeholder="Message" placeholderTextColor="#8a8a9c" style={styles.composerInput} />
          <GlassButton variant="dark" style={styles.sendBtn} onPress={() => {}}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </GlassButton>
        </View>
      </SafeAreaView>

      {/* overlays */}
      <BubbleMenu
        target={menuTarget}
        previewText={menuTarget ? previewOf(menuTarget.index) : ""}
        onAction={handleAction}
        onReact={(e) => { setReactions((r) => ({ ...r, [menuTarget.index]: e })); setMenuTarget(null); }}
        onClose={() => setMenuTarget(null)}
      />
      {pinPending !== false && (
        <PinPrompt
          chat={chat}
          onConfirm={() => { setPinnedText(previewOf(pinPending)); setPinPending(false); }}
          onCancel={() => setPinPending(false)}
        />
      )}
      <AttachSheet visible={attachOpen} isGroup={chat.group} onClose={() => setAttachOpen(false)} onPick={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  topbar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { paddingLeft: 10, paddingRight: 14, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "500", color: "#33333F" },
  namePill: { flex: 1, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 100 },
  topbarName: { fontSize: 15, fontWeight: "700", color: "#1A1A26" },
  topbarSub: { fontSize: 11.5, color: "#7a7a8c" },
  topAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  topAvatarText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  pinnedBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 4, backgroundColor: "rgba(255,255,255,0.82)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", paddingVertical: 8, paddingHorizontal: 12 },
  pinnedAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: ACCENT },
  pinnedLabel: { fontSize: 12, fontWeight: "700", color: "#4230a0" },
  pinnedText: { fontSize: 13, color: "#33333F" },

  messages: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 90, gap: 8 },
  dateChip: { alignSelf: "center", backgroundColor: "rgba(90,110,180,0.14)", borderRadius: 100, paddingVertical: 4, paddingHorizontal: 12, marginVertical: 6 },
  dateChipText: { fontSize: 11.5, fontWeight: "600", color: "#6E6E80" },

  bubble: { maxWidth: "80%", paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, shadowColor: "#3240A0", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bubbleMedia: { paddingVertical: 4, paddingHorizontal: 4 },
  bubbleMine: { backgroundColor: ACCENT, borderColor: "rgba(255,255,255,0.18)", borderRadius: 18, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: "rgba(255,255,255,0.62)", borderColor: "rgba(255,255,255,0.75)", borderRadius: 18, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  sender: { fontSize: 12.5, fontWeight: "700", color: "#7a4fbf", marginBottom: 2, paddingHorizontal: 6, paddingTop: 4 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 },
  bubbleTime: { fontSize: 10.5 },
  reactChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 6, borderRadius: 100, paddingVertical: 2, paddingLeft: 6, paddingRight: 9 },

  mediaWrap: { gap: 6 },
  caption: { fontSize: 14, lineHeight: 19, paddingHorizontal: 7, paddingBottom: 2 },
  mediaBox: { width: 232, maxWidth: "100%", height: 168, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  playCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" },
  durChip: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.42)", borderRadius: 100, paddingVertical: 1, paddingHorizontal: 7 },
  durChipText: { fontSize: 10.5, color: "#fff" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 11, width: 220, maxWidth: "100%" },
  fileIcon: { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  fileText: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13.5, fontWeight: "600" },
  fileMeta: { fontSize: 11.5 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 10, width: 218, maxWidth: "100%" },
  audioBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  audioDur: { fontSize: 11.5, flexShrink: 0 },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 24, overflow: "hidden" },

  pollWrap: { width: 264, maxWidth: "100%", gap: 8 },
  pollHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  pollIcon: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pollQ: { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  pollKicker: { fontSize: 11.5, marginTop: -2, marginBottom: 2 },
  pollOpt: { position: "relative", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 13, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 13, overflow: "hidden" },
  pollFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 13 },
  pollOptLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  pollOptPct: { fontSize: 13.5, fontWeight: "700" },
  pollVotes: { fontSize: 11.5, marginTop: 1 },

  composer: { position: "absolute", left: 12, right: 12, bottom: 14, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 26, paddingVertical: 7, paddingLeft: 14, paddingRight: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.75)" },
  composerInput: { flex: 1, fontSize: 15, color: "#22222E" },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,32,58,0.36)" },
  menuWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  reactBar: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", paddingVertical: 7, paddingHorizontal: 9 },
  reactBtn: { padding: 3 },
  menuCard: { minWidth: 224, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", alignSelf: "flex-start" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 18 },
  menuLabel: { fontSize: 15, color: "#22222E" },
  menuDivider: { height: 1, backgroundColor: "rgba(90,110,180,0.18)", marginHorizontal: 16, marginVertical: 2 },

  pinBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,32,58,0.42)" },
  pinWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  pinCard: { width: "100%", maxWidth: 280, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  pinTitle: { textAlign: "center", fontSize: 13.5, color: "#6E6E80", paddingTop: 18, paddingBottom: 12, paddingHorizontal: 20 },
  pinBtn: { paddingVertical: 14, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(90,110,180,0.16)" },
  pinBtnText: { fontSize: 15, fontWeight: "600" },
});
