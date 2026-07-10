/**
 * GlassButton — Liquid Glass button that reacts to touch.
 *
 * Variants:
 *   "dark"  — prominent, keeps a near-black fill (e.g. Connect / primary).
 *   "light" — translucent light glass (e.g. arrow, +n, filter chips).
 *   "plain" — no glass chrome, transparent (unselected tab / icon-only).
 *
 * On press the whole button scales to 0.97 and brightens slightly, mirroring
 * the way real Liquid Glass responds to touch (Apple's `interactive` modifier).
 */

import React, { useRef } from "react";
import { Animated, Pressable, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { View } from "react-native";

export default function GlassButton({
  children,
  label,
  variant = "light",
  onPress,
  radius = 100,
  style,
  textStyle,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  const v = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.97)}
      onPressOut={() => spring(1)}
    >
      <Animated.View
        style={[
          { borderRadius: radius, overflow: "hidden", transform: [{ scale }] },
          v.container,
          style,
        ]}
      >
        {variant !== "plain" && (
          <>
            <BlurView
              intensity={variant === "dark" ? 25 : 40}
              tint={variant === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: v.fill }]} />
            {/* specular border */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderTopColor: v.rimLight,
                  borderLeftColor: v.rimLight,
                  borderBottomWidth: 1,
                  borderRightWidth: 1,
                  borderBottomColor: v.rimDark,
                  borderRightColor: v.rimDark,
                },
              ]}
            />
          </>
        )}
        <View style={styles.content}>
          {label ? (
            <Text style={[styles.label, { color: v.text }, textStyle]}>{label}</Text>
          ) : (
            children
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const VARIANTS = {
  dark: {
    container: {
      shadowColor: "#141838",
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    fill: "rgba(18,19,30,0.9)",
    rimLight: "rgba(255,255,255,0.28)",
    rimDark: "rgba(0,0,0,0.22)",
    text: "#FFFFFF",
  },
  light: {
    container: {
      shadowColor: "#465AAA",
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    fill: "rgba(255,255,255,0.34)",
    rimLight: "rgba(255,255,255,0.55)",
    rimDark: "rgba(90,110,180,0.16)",
    text: "#3A3560",
  },
  plain: {
    container: {},
    fill: "transparent",
    rimLight: "transparent",
    rimDark: "transparent",
    text: "#7A7A87",
  },
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "600" },
});
