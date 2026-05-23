const primary = "#D4471C";
const accent = "#4A90D9";

const Colors = {
  light: {
    text: "#1A1A1A",
    background: "#FFFFFF",
    tint: primary,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: primary,
    border: "#E5E7EB",
    card: "#F9FAFB",
    muted: "#6B7280",
    primary,
    accent,
  },
  dark: {
    text: "#F9FAFB",
    background: "#111827",
    tint: primary,
    tabIconDefault: "#6B7280",
    tabIconSelected: primary,
    border: "#374151",
    card: "#1F2937",
    muted: "#9CA3AF",
    primary,
    accent,
  },
} as const;

export type ColorScheme = "light" | "dark";
export default Colors;
