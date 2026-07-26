import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BLOCK, COPY, onDark } from "./moderationTheme";

type RemovedTombstoneProps = {
  what?: string;
  dark?: boolean;
};

export function RemovedTombstone({ what, dark = false }: RemovedTombstoneProps) {
  const ink = dark ? onDark.tombInk : BLOCK.ink;
  const boxed = Boolean(what);

  return (
    <View style={[styles.row, boxed ? styles.box : null]}>
      <Ionicons name="ban-outline" size={boxed ? 16 : 15} color={ink} />
      <Text style={[styles.text, { color: ink }]}>
        {what ? COPY.removedField(what) : COPY.removedMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  box: {
    backgroundColor: BLOCK.soft,
    borderColor: BLOCK.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontStyle: "italic",
  },
});
