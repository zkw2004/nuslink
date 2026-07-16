import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

export type MessageActionKey =
  | "reply"
  | "copy"
  | "edit"
  | "pin"
  | "forward"
  | "delete"
  | "select";

const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"] as const;

const MENU_ITEMS: {
  key: MessageActionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  mineOnly?: boolean;
  danger?: boolean;
}[] = [
  { key: "reply", label: "Reply", icon: "arrow-undo-outline" },
  { key: "copy", label: "Copy", icon: "copy-outline" },
  { key: "edit", label: "Edit", icon: "create-outline", mineOnly: true },
  { key: "pin", label: "Pin", icon: "bookmark-outline" },
  { key: "forward", label: "Forward", icon: "arrow-redo-outline" },
  { key: "delete", label: "Delete", icon: "trash-outline", danger: true },
  { key: "select", label: "Select", icon: "checkmark-circle-outline" },
];

export function MessageActionMenu({
  visible,
  isMine,
  onClose,
  onAction,
  onReact,
}: {
  visible: boolean;
  isMine: boolean;
  onClose: () => void;
  onAction: (action: MessageActionKey) => void;
  onReact: (emoji: string) => void;
}) {
  const items = MENU_ITEMS.filter((item) => !item.mineOnly || isMine);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { alignItems: isMine ? "flex-end" : "flex-start" }]}
      >
        <View style={styles.reactBar}>
          {REACTIONS.map((emoji) => (
            <Pressable key={emoji} style={styles.reactButton} onPress={() => onReact(emoji)}>
              <Text style={styles.reactText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menuCard}>
          <BlurView intensity={55} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
          <View style={styles.menuTint} />
          {items.map((item, index) => (
            <View key={item.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable style={styles.menuItem} onPress={() => onAction(item.key)}>
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={item.danger ? "#D2483F" : "#33333F"}
                />
                <Text style={[styles.menuLabel, item.danger ? styles.dangerLabel : null]}>
                  {item.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(24,28,48,0.32)",
  },
  wrap: {
    bottom: 70,
    left: 18,
    position: "absolute",
    right: 18,
  },
  reactBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 2,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reactButton: {
    padding: 6,
  },
  reactText: {
    fontSize: 23,
  },
  menuCard: {
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 220,
    overflow: "hidden",
  },
  menuTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  divider: {
    backgroundColor: "rgba(90,110,180,0.13)",
    height: 1,
  },
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuLabel: {
    color: "#33333F",
    fontSize: 15,
    fontWeight: "600",
  },
  dangerLabel: {
    color: "#D2483F",
  },
});
