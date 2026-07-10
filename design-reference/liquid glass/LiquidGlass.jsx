/**
 * LiquidGlass — reusable iOS 26 "Liquid Glass" surface primitives.
 *
 * Deps (Expo): expo-blur, expo-linear-gradient
 *   expo install expo-blur expo-linear-gradient
 *
 * The web prototype fakes Liquid Glass with backdrop-filter + an SVG
 * feDisplacementMap. Neither exists in RN, so here the effect is built from:
 *   1. <BlurView> — the system material (real frosted glass on iOS 26).
 *   2. a low-opacity tint overlay (the "adaptive fill").
 *   3. a specular border: bright top-left rim + subtle dark bottom-right rim,
 *      faked with two stacked absolutely-positioned hairline views.
 *
 * On Android backdrop blur is unreliable — BlurView degrades to a translucent
 * tint, which still reads fine with the specular border on top.
 */

import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

/**
 * GlassSurface — frosted container. Pass `tint` ("light" | "dark") and any
 * borderRadius via style. Children render above the blur + fill + specular.
 */
export function GlassSurface({
  children,
  tint = "light",
  intensity = 40,
  radius = 24,
  fill,
  style,
}) {
  const fillColor =
    fill ?? (tint === "dark" ? "rgba(18,19,30,0.55)" : "rgba(255,255,255,0.34)");

  return (
    <View style={[{ borderRadius: radius, overflow: "hidden" }, styles.lift, style]}>
      <BlurView
        intensity={intensity}
        tint={tint === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={StyleSheet.absoluteFill}
      />
      {/* adaptive tint fill */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]} />
      {/* specular edge — bright top-left */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderTopColor: "rgba(255,255,255,0.6)",
            borderLeftColor: "rgba(255,255,255,0.45)",
          },
        ]}
      />
      {/* specular edge — subtle dark bottom-right */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderBottomColor:
              tint === "dark" ? "rgba(0,0,0,0.28)" : "rgba(90,110,180,0.18)",
            borderRightColor:
              tint === "dark" ? "rgba(0,0,0,0.22)" : "rgba(90,110,180,0.14)",
          },
        ]}
      />
      <View style={{ position: "relative" }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  lift: {
    shadowColor: "#3240A0",
    shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
});

export const GLASS_TINT = { light: "light", dark: "dark" };
