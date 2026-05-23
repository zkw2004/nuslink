import { Platform } from "react-native";

export const fontFamily = {
  regular: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
  medium: Platform.select({ ios: "System", android: "Roboto-Medium", default: "System" }),
  bold: Platform.select({ ios: "System", android: "Roboto-Bold", default: "System" }),
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;
