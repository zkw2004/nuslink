export const FLAG = {
  ink: "#B0742A",
  soft: "#F6EDDD",
  border: "#E4C89A",
  chip: "#EFD9B0",
};

export const BLOCK = {
  ink: "#6E7280",
  soft: "rgba(90,110,180,0.10)",
  border: "rgba(90,110,180,0.20)",
  alertIcon: "#C6462F",
  alertSoft: "#F7E3DD",
};

export const onDark = {
  flagInk: "rgba(255,255,255,0.92)",
  flagChip: "rgba(255,255,255,0.18)",
  tombInk: "rgba(255,255,255,0.82)",
};

export const COPY = {
  blockAlertTitle: "This content can't be posted",
  blockAlertBody:
    "It goes against NUSLink's community guidelines. Please revise it before posting.",
  flaggedLabel: "This content was flagged",
  flaggedMessageLabel: "This message was flagged",
  showAnyway: "Show anyway",
  hide: "Flagged · Hide",
  removedMessage: "Message removed for breaking community guidelines",
  removedField: (what: string) =>
    `${what} removed for breaking community guidelines`,
};
