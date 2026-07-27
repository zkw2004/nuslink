import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";

import { ProfileImportScreen } from "@features/profile/ProfileImportScreen";

export default function ImportResumeRoute() {
  return <ProfileImportScreen />;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Resume import could not open</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void retry();
        }}
        style={styles.retryButton}
      >
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    padding: 24,
    backgroundColor: "#F6F8FD",
  },
  errorTitle: {
    color: "#171923",
    fontSize: 22,
    fontWeight: "800",
  },
  errorBody: {
    color: "#536174",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#171923",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
