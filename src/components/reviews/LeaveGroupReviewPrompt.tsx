import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassButton } from "@components/shared";
import { MemberReviewRow } from "@components/reviews/MemberReviewRow";
import type { ReviewableGroupMember } from "@appTypes/index";

type Props = {
  visible: boolean;
  group: { id: string; name: string } | null;
  members: ReviewableGroupMember[];
  onCancel: () => void;
  onLeave: () => void;
  onRate: (member: ReviewableGroupMember) => void;
  refreshToken?: number;
};

export function LeaveGroupReviewPrompt({
  visible,
  group,
  members,
  onCancel,
  onLeave,
  onRate,
  refreshToken = 0,
}: Props) {
  if (!group) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.title}>Rate your groupmates?</Text>
            <Text style={styles.subtitle}>
              You spent enough time in {group.name} to rate the people you worked with.
              Reviews stay tied to this group, so take a moment before you leave.
            </Text>

            <View>
              {members.map((member, index) => (
                <MemberReviewRow
                  key={member.id}
                  groupId={group.id}
                  isLast={index === members.length - 1}
                  member={member}
                  onRate={onRate}
                  refreshToken={refreshToken}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <GlassButton
                label="Stay"
                onPress={onCancel}
                style={styles.actionButton}
                variant="light"
              />
              <GlassButton
                label="Leave group"
                onPress={onLeave}
                style={styles.actionButton}
                variant="dark"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(18,19,30,0.32)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  safeArea: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F4F5FB",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "rgba(90,110,180,0.28)",
    borderRadius: 100,
    height: 5,
    width: 40,
  },
  title: {
    color: "#1A1A26",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#6E6E80",
    fontSize: 13.5,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  actionButton: {
    flex: 1,
  },
});
