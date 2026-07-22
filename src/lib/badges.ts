import type { BadgeTier } from "@appTypes/index";

export const TIER_META = {
  new: {
    label: "New",
    gradient: ["#CDCEDA", "#A6A8BC"],
    ink: "#6E6E80",
    soft: "#EEEEF3",
  },
  bronze: {
    label: "Reliable",
    gradient: ["#D5A264", "#B07536"],
    ink: "#8A6230",
    soft: "#F4E7D5",
  },
  silver: {
    label: "Trusted",
    gradient: ["#D6DAE4", "#A9AEC0"],
    ink: "#6C7180",
    soft: "#EEF0F5",
  },
  gold: {
    label: "Standout",
    gradient: ["#F1D07A", "#D6A63C"],
    ink: "#977A2E",
    soft: "#F7EFD5",
  },
} as const;

export function tierMeta(tier: BadgeTier | null) {
  return TIER_META[tier ?? "new"];
}

export function tierLabel(tier: BadgeTier | null) {
  return tierMeta(tier).label;
}
