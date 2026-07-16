/**
 * NewChatSheet — Liquid Glass bottom sheet for starting a new chat.
 * Dimmed backdrop, dark glass close button, frosted sheet with grabber,
 * glass search field, and connected-people rows with a glass action button.
 * Render conditionally over any screen: {showNewChat && <NewChatSheet ... />}
 * Deps (Expo): expo install expo-blur expo-linear-gradient @expo/vector-icons
 */

import React from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import GlassButton from "./GlassButton";
import { CONNECTED } from "./chatData";

export default function NewChatSheet({ onClose, onSelectPerson }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={styles.closeWrap}>
        <GlassButton variant="dark" style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={17} color="#fff" />
        </GlassButton>
      </View>

      <View style={styles.sheet}>
        <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(240,243,252,0.8)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.grabber} />
        <Text style={styles.title}>New message</Text>

        <View style={styles.search}>
          <Ionicons name="search" size={16} color="#8a8a9c" />
          <TextInput placeholder="Search connected people" placeholderTextColor="#8a8a9c" style={styles.searchInput} />
        </View>

        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {CONNECTED.map((p) => (
            <View key={p.name} style={styles.personRow}>
              <LinearGradient colors={p.avatarBg} style={styles.avatar}>
                <Text style={styles.avatarText}>{p.initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.personSub}>{p.sub}</Text>
              </View>
              <GlassButton
                variant={p.existing ? "light" : "dark"}
                label={p.existing ? "Existing chat" : "Message"}
                onPress={() => onSelectPerson?.(p)}
                style={{ paddingHorizontal: 15, paddingVertical: 9 }}
                textStyle={{ fontSize: 12.5, color: p.existing ? "#33333F" : "#fff" }}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(40,48,90,0.28)" },
  closeWrap: { position: "absolute", top: 52, right: 18, zIndex: 2 },
  closeBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: "82%", borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.85)", padding: 22, overflow: "hidden", gap: 16, shadowColor: "#3240A0", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -12 } },
  grabber: { width: 40, height: 5, borderRadius: 100, backgroundColor: "rgba(90,110,180,0.28)", alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A26" },
  search: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", paddingVertical: 12, paddingHorizontal: 15 },
  searchInput: { flex: 1, fontSize: 15, color: "#22222E" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  personName: { fontSize: 15, fontWeight: "600", color: "#1A1A26" },
  personSub: { fontSize: 12.5, color: "#6E6E80" },
});
