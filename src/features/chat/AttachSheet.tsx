import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type AttachType = "photo" | "video" | "file" | "audio" | "poll";

const OPTIONS: {
  type: AttachType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string];
  groupOnly?: boolean;
}[] = [
  { type: "photo", label: "Photo", icon: "image", colors: ["#5B8DEF", "#2F6FD6"] },
  { type: "video", label: "Video", icon: "videocam", colors: ["#F06292", "#D1467C"] },
  { type: "file", label: "File", icon: "document-text", colors: ["#7986CB", "#5561B8"] },
  { type: "audio", label: "Audio", icon: "mic", colors: ["#FFA726", "#F57C00"] },
  {
    type: "poll",
    label: "Poll",
    icon: "stats-chart",
    colors: ["#66BB6A", "#43A047"],
    groupOnly: true,
  },
];

export function AttachSheet({
  visible,
  isGroup,
  allowedTypes,
  onClose,
  onPick,
}: {
  visible: boolean;
  isGroup: boolean;
  allowedTypes?: AttachType[];
  onClose: () => void;
  onPick: (type: AttachType) => void;
}) {
  const options = OPTIONS.filter(
    (option) =>
      (!option.groupOnly || isGroup) &&
      (!allowedTypes || allowedTypes.includes(option.type)),
  );

  function handlePick(type: AttachType) {
    onPick(type);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.sheet}>
        <BlurView intensity={60} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
        <View style={styles.sheetTint} />
        <View style={styles.grabber} />
        <View style={styles.grid}>
          {options.map((option) => (
            <Pressable
              key={option.type}
              style={styles.option}
              onPress={() => handlePick(option.type)}
            >
              <LinearGradient colors={option.colors} style={styles.optionIcon}>
                <Ionicons name={option.icon} size={26} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(28,32,58,0.34)",
    flex: 1,
  },
  sheet: {
    borderColor: "rgba(255,255,255,0.85)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 14,
    position: "absolute",
    right: 0,
  },
  sheetTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "rgba(90,110,180,0.28)",
    borderRadius: 3,
    height: 5,
    marginBottom: 18,
    width: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  option: {
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    width: "25%",
  },
  optionIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  optionLabel: {
    color: "#33333F",
    fontSize: 12.5,
    fontWeight: "500",
  },
});
