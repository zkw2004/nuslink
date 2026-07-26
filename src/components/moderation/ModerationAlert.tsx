import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BLOCK, COPY } from "./moderationTheme";

type ModerationAlertProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
};

export function ModerationAlert({
  visible,
  onClose,
  title = COPY.blockAlertTitle,
  body = COPY.blockAlertBody,
}: ModerationAlertProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.halo}>
            <Ionicons name="warning-outline" size={26} color={BLOCK.alertIcon} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Revise</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    alignItems: "center",
    backgroundColor: "rgba(30,36,66,0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#FBFBFE",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 26,
    borderWidth: 1,
    elevation: 12,
    gap: 12,
    maxWidth: 290,
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 24,
    shadowColor: "#28326E",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    width: "100%",
  },
  halo: {
    alignItems: "center",
    backgroundColor: BLOCK.alertSoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  title: {
    color: "#1A1A24",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: "#5B6472",
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#16181E",
    borderRadius: 100,
    marginTop: 6,
    paddingVertical: 13,
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "600",
  },
});
