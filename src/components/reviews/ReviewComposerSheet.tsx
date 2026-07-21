import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppAvatar, GlassButton } from "@components/shared";
import type { ReviewComposerTarget } from "@appTypes/index";
import { submitGroupReview, type SubmittedGroupReview } from "@services/reviewService";

const CATEGORIES = [
  {
    key: "reliability",
    label: "Reliability",
    hint: "Showed up and followed through",
  },
  {
    key: "communication",
    label: "Communication",
    hint: "Kept the group in the loop",
  },
  {
    key: "contribution",
    label: "Contribution",
    hint: "Pulled their weight on the work",
  },
] as const;

const WORD_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;
const STAR_ON = "#E8B23C";
const STAR_OFF = "#D9DAE2";
const MAX_REVIEW_LENGTH = 500;

type RatingKey = (typeof CATEGORIES)[number]["key"];

type Props = {
  visible: boolean;
  target: ReviewComposerTarget | null;
  onClose: () => void;
  onSubmitted?: (review: SubmittedGroupReview) => void;
};

function StarRating({
  hint,
  label,
  onChange,
  value,
}: {
  hint: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.ratingBlock}>
      <View style={styles.ratingHeader}>
        <Text style={styles.categoryLabel}>{label}</Text>
        {value > 0 ? <Text style={styles.categoryWord}>{WORD_LABELS[value]}</Text> : null}
      </View>
      <Text style={styles.categoryHint}>{hint}</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((index) => (
          <Pressable
            key={index}
            accessibilityLabel={`${label} ${index} of 5, ${WORD_LABELS[index]}`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => onChange(index)}
            style={styles.starHit}
          >
            <Ionicons
              name="star"
              size={30}
              color={index <= value ? STAR_ON : STAR_OFF}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ReviewComposerSheet({
  visible,
  target,
  onClose,
  onSubmitted,
}: Props) {
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    communication: 0,
    contribution: 0,
    reliability: 0,
  });
  const [writtenReview, setWrittenReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      return;
    }

    setRatings({
      communication: 0,
      contribution: 0,
      reliability: 0,
    });
    setWrittenReview("");
    setIsSubmitting(false);
  }, [visible]);

  const canSubmit = useMemo(
    () =>
      ratings.reliability > 0 &&
      ratings.communication > 0 &&
      ratings.contribution > 0 &&
      !isSubmitting &&
      target !== null,
    [isSubmitting, ratings, target],
  );

  async function handleSubmit() {
    if (!canSubmit || !target) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitGroupReview({
        group_id: target.group_id,
        reviewee_id: target.reviewee.id,
        reliability_score: ratings.reliability,
        communication_score: ratings.communication,
        contribution_score: ratings.contribution,
        written_review: writtenReview.trim() || null,
      });

      onSubmitted?.(result);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  if (!target) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <AppAvatar
                name={target.reviewee.display_name}
                size={48}
                imageUri={target.reviewee.avatar_url}
              />
              <View style={styles.headerText}>
                <Text style={styles.title}>Rate {target.reviewee.display_name}</Text>
                <View style={styles.groupLine}>
                  <Ionicons name="people-outline" size={14} color="#5646B0" />
                  <Text numberOfLines={1} style={styles.groupName}>
                    {target.group_name}
                  </Text>
                </View>
              </View>
              <Pressable hitSlop={8} onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={16} color="#40404F" />
              </Pressable>
            </View>

            <Text style={styles.note}>
              This review is tied to your time together in this group.
            </Text>

            {CATEGORIES.map((category) => (
              <StarRating
                key={category.key}
                hint={category.hint}
                label={category.label}
                value={ratings[category.key]}
                onChange={(value) =>
                  setRatings((current) => ({ ...current, [category.key]: value }))
                }
              />
            ))}

            <View style={styles.field}>
              <TextInput
                multiline
                onChangeText={(value) => setWrittenReview(value.slice(0, MAX_REVIEW_LENGTH))}
                placeholder="Add a written review (optional)"
                placeholderTextColor="#8A8A9C"
                style={styles.input}
                textAlignVertical="top"
                value={writtenReview}
              />
              <Text style={styles.counter}>
                {writtenReview.length}/{MAX_REVIEW_LENGTH}
              </Text>
            </View>

            <GlassButton
              disabled={!canSubmit}
              label={isSubmitting ? "Submitting..." : "Submit review"}
              onPress={() => {
                void handleSubmit();
              }}
              style={styles.submitButton}
              textStyle={!canSubmit ? styles.disabledSubmitText : undefined}
              variant={canSubmit ? "dark" : "light"}
            />
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
    gap: 16,
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  headerText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: "#1A1A26",
    fontSize: 17,
    fontWeight: "700",
  },
  groupLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  groupName: {
    color: "#5646B0",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  note: {
    backgroundColor: "#E9E9F5",
    borderRadius: 12,
    color: "#6E6E80",
    fontSize: 12.5,
    lineHeight: 17.5,
    padding: 12,
  },
  ratingBlock: {
    gap: 8,
  },
  ratingHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryLabel: {
    color: "#22222E",
    fontSize: 15,
    fontWeight: "600",
  },
  categoryWord: {
    color: "#B08A2E",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryHint: {
    color: "#75758A",
    fontSize: 12,
    marginTop: -3,
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
  },
  starHit: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  field: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  input: {
    color: "#22222E",
    fontSize: 14,
    lineHeight: 21,
    minHeight: 74,
  },
  counter: {
    alignSelf: "flex-end",
    color: "#75758A",
    fontSize: 11.5,
  },
  submitButton: {
    borderRadius: 100,
  },
  disabledSubmitText: {
    color: "#8A8A9C",
  },
});
