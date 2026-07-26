import { Alert } from "react-native";

import { api } from "@lib/api";
import type {
  ModerationOutcome,
  ModerationResult,
  ModerationSubjectType,
} from "@appTypes/index";

type ModerationCheckResponse = {
  subject_type: ModerationSubjectType;
  subject_id: string | null;
  source_table: string | null;
  source_column: string | null;
  outcome: ModerationOutcome;
  categories: string[];
  confidence: number | null;
  reason: string | null;
  visible: boolean;
};

type ModerationBatchResponse = {
  overall_outcome: ModerationOutcome;
  visible: boolean;
  results: ModerationCheckResponse[];
};

type ModerationCheckInput = {
  subjectType: ModerationSubjectType;
  content: string;
  subjectId?: string | null;
  sourceTable?: string | null;
  sourceColumn?: string | null;
};

export type ModerationBatchItem = ModerationCheckInput & {
  key: string;
};

function normalizeVerdict(outcome: string | null | undefined): ModerationOutcome {
  if (
    outcome === "blocked" ||
    outcome === "flagged" ||
    outcome === "error"
  ) {
    return outcome;
  }
  return "allowed";
}

function mapResult(response: ModerationCheckResponse): ModerationResult {
  return {
    subject_type: response.subject_type,
    subject_id: response.subject_id,
    source_table: response.source_table,
    source_column: response.source_column,
    verdict: normalizeVerdict(response.outcome),
    categories: response.categories ?? [],
    confidence: response.confidence,
    reason: response.reason,
    visible: response.visible,
  };
}

export async function checkContent(
  input: ModerationCheckInput,
): Promise<ModerationResult> {
  if (!input.content.trim()) {
    return {
      subject_type: input.subjectType,
      subject_id: input.subjectId ?? null,
      source_table: input.sourceTable ?? null,
      source_column: input.sourceColumn ?? null,
      verdict: "allowed",
      categories: [],
      confidence: 0,
      reason: null,
      visible: true,
    };
  }

  try {
    const response = await api.post<ModerationCheckResponse>(
      "/v1/moderation/check",
      {
        subject_type: input.subjectType,
        content: input.content,
        subject_id: input.subjectId ?? null,
        source_table: input.sourceTable ?? null,
        source_column: input.sourceColumn ?? null,
      },
    );

    return mapResult(response);
  } catch (error) {
    return {
      subject_type: input.subjectType,
      subject_id: input.subjectId ?? null,
      source_table: input.sourceTable ?? null,
      source_column: input.sourceColumn ?? null,
      verdict: "error",
      categories: [],
      confidence: null,
      reason: error instanceof Error ? error.message : "Moderation unavailable.",
      visible: true,
    };
  }
}

export async function checkContentBatch(
  items: ModerationBatchItem[],
): Promise<Record<string, ModerationResult>> {
  const nonEmptyItems = items.filter((item) => item.content.trim());
  const resultsByKey: Record<string, ModerationResult> = {};

  for (const item of items) {
    if (!item.content.trim()) {
      resultsByKey[item.key] = {
        subject_type: item.subjectType,
        subject_id: item.subjectId ?? null,
        source_table: item.sourceTable ?? null,
        source_column: item.sourceColumn ?? null,
        verdict: "allowed",
        categories: [],
        confidence: 0,
        reason: null,
        visible: true,
      };
    }
  }

  if (nonEmptyItems.length === 0) {
    return resultsByKey;
  }

  try {
    const response = await api.post<ModerationBatchResponse>(
      "/v1/moderation/check-batch",
      {
        items: nonEmptyItems.map((item) => ({
          subject_type: item.subjectType,
          content: item.content,
          subject_id: item.subjectId ?? null,
          source_table: item.sourceTable ?? null,
          source_column: item.sourceColumn ?? null,
        })),
      },
    );

    response.results.forEach((result, index) => {
      const key = nonEmptyItems[index]?.key;
      if (key) {
        resultsByKey[key] = mapResult(result);
      }
    });
  } catch {
    for (const item of nonEmptyItems) {
      resultsByKey[item.key] = {
        subject_type: item.subjectType,
        subject_id: item.subjectId ?? null,
        source_table: item.sourceTable ?? null,
        source_column: item.sourceColumn ?? null,
        verdict: "error",
        categories: [],
        confidence: null,
        reason: "Moderation unavailable.",
        visible: true,
      };
    }
  }

  return resultsByKey;
}

export function hasBlockedModeration(
  results: Record<string, ModerationResult>,
): boolean {
  return Object.values(results).some((result) => result.verdict === "blocked");
}

export function hasFlaggedModeration(
  results: Record<string, ModerationResult>,
): boolean {
  return Object.values(results).some((result) => result.verdict === "flagged");
}

export function getAggregateModerationVerdict(
  results: Record<string, ModerationResult>,
): ModerationOutcome {
  if (hasBlockedModeration(results)) {
    return "blocked";
  }
  if (hasFlaggedModeration(results)) {
    return "flagged";
  }
  if (Object.values(results).some((result) => result.verdict === "error")) {
    return "error";
  }
  return "allowed";
}

export function confirmFlaggedContent(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Content flagged", message, [
      { text: "Revise", style: "cancel", onPress: () => resolve(false) },
      { text: "Post anyway", onPress: () => resolve(true) },
    ]);
  });
}

export function confirmModerationUnavailable(reason?: string | null): Promise<boolean> {
  return new Promise((resolve) => {
    const detail = reason ? `\n\nReason: ${reason}` : "";
    Alert.alert(
      "Moderation unavailable",
      `We could not check this content right now. Send it anyway?${detail}`,
      [
        { text: "Keep editing", style: "cancel", onPress: () => resolve(false) },
        { text: "Send anyway", onPress: () => resolve(true) },
      ],
    );
  });
}
