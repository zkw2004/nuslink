import { useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";

type GlassSurfaceProps = {
  children: ReactNode;
  tint?: "light" | "dark";
  intensity?: number;
  radius?: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
};

type GlassButtonProps = PressableProps & {
  children?: ReactNode;
  label?: string;
  variant?: "dark" | "light" | "plain";
  radius?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const BUTTON_VARIANTS = {
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

export function GlassSurface({
  children,
  tint = "light",
  intensity = 40,
  radius = 24,
  fill,
  style,
}: GlassSurfaceProps) {
  const fillColor =
    fill ?? (tint === "dark" ? "rgba(18,19,30,0.55)" : "rgba(255,255,255,0.34)");

  return (
    <View style={[styles.surfaceShell, styles.lift, { borderRadius: radius }, style]}>
      <BlurView
        intensity={intensity}
        tint={tint === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderLeftWidth: 1,
            borderTopWidth: 1,
            borderLeftColor: "rgba(255,255,255,0.45)",
            borderTopColor: "rgba(255,255,255,0.6)",
          },
        ]}
      />
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
      <View style={styles.surfaceContent}>{children}</View>
    </View>
  );
}

export function GlassButton({
  children,
  label,
  variant = "light",
  radius = 100,
  style,
  textStyle,
  onPress,
  ...pressableProps
}: GlassButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const variantStyle = BUTTON_VARIANTS[variant];

  function spring(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      {...pressableProps}
      onPress={onPress}
      onPressIn={(event) => {
        spring(0.97);
        pressableProps.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        spring(1);
        pressableProps.onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[
          styles.buttonShell,
          { borderRadius: radius, transform: [{ scale }] },
          variantStyle.container,
          style,
        ]}
      >
        {variant !== "plain" ? (
          <>
            <BlurView
              intensity={variant === "dark" ? 25 : 40}
              tint={
                variant === "dark"
                  ? "systemChromeMaterialDark"
                  : "systemChromeMaterialLight"
              }
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: variantStyle.fill },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  borderBottomWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderTopWidth: 1,
                  borderBottomColor: variantStyle.rimDark,
                  borderLeftColor: variantStyle.rimLight,
                  borderRightColor: variantStyle.rimDark,
                  borderTopColor: variantStyle.rimLight,
                },
              ]}
            />
          </>
        ) : null}
        <View style={label ? styles.buttonLabelContent : styles.buttonIconContent}>
          {label ? (
            <Text
              style={[styles.buttonLabel, { color: variantStyle.text }, textStyle]}
            >
              {label}
            </Text>
          ) : (
            children
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surfaceShell: {
    overflow: "hidden",
  },
  surfaceContent: {
    position: "relative",
  },
  lift: {
    shadowColor: "#3240A0",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonShell: {
    overflow: "hidden",
  },
  buttonLabelContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: "relative",
    zIndex: 1,
  },
  buttonIconContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
