import { Alert } from "react-native";

import { api } from "@lib/api";
import { supabase } from "@lib/supabase";
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

type MessageModerationTarget =
  | { kind: "direct"; messageId: string; content: string }
  | { kind: "group"; messageId: string; content: string }
  | { kind: "community"; messageId: string; content: string };

type ProfileModerationTarget = {
  profileId: string;
  headline: string;
  bio: string;
};

type ContainerModerationTarget =
  | { kind: "group"; id: string; name: string; description: string }
  | {
      kind: "community";
      id: string;
      name: string;
      description: string;
      tags: string[];
    };

type FastModerationDecision =
  | { outcome: "blocked"; reason: string }
  | { outcome: "pending" };

const ABUSIVE_PROFANITY_PATTERN =
  /\b(f+u+c+k+(?:ing|er|ed)?|f+ck(?:ing|er|ed)?|shit+|bitch+|cunt+)\b/i;
const DIRECTED_ATTACK_PATTERN =
  /\b(u|you|ur|your|idiot|moron|stupid|dumb|loser)\b/i;

function normalizeVerdict(outcome: string | null | undefined): ModerationOutcome {
  if (
    outcome === "blocked" ||
    outcome === "flagged" ||
    outcome === "pending" ||
    outcome === "error"
  ) {
    return outcome;
  }
  return "allowed";
}

export function classifyFastChatModeration(content: string): FastModerationDecision {
  const trimmed = content.trim();
  if (
    ABUSIVE_PROFANITY_PATTERN.test(trimmed) &&
    DIRECTED_ATTACK_PATTERN.test(trimmed)
  ) {
    return {
      outcome: "blocked",
      reason: "Targets another user with abusive profanity.",
    };
  }

  return { outcome: "pending" };
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

async function updateTableOutcome(
  table:
    | "direct_messages"
    | "group_messages"
    | "community_messages"
    | "groups"
    | "communities",
  id: string,
  outcome: ModerationOutcome,
) {
  if (!supabase) {
    return;
  }

  await supabase.from(table).update({ moderation_outcome: outcome }).eq("id", id);
}

export function moderateMessageInBackground(
  target: MessageModerationTarget,
  onComplete?: () => void,
) {
  void (async () => {
    try {
      const config =
        target.kind === "direct"
          ? {
              table: "direct_messages" as const,
              subjectType: "direct_chat_message" as const,
            }
          : target.kind === "group"
            ? {
                table: "group_messages" as const,
                subjectType: "group_chat_message" as const,
              }
            : {
                table: "community_messages" as const,
                subjectType: "community_chat_message" as const,
              };

      const result = await checkContent({
        subjectType: config.subjectType,
        content: target.content,
        subjectId: target.messageId,
        sourceTable: config.table,
        sourceColumn: "body",
      });

      await updateTableOutcome(config.table, target.messageId, result.verdict);
      onComplete?.();
    } catch {
      await updateTableOutcome(
        target.kind === "direct"
          ? "direct_messages"
          : target.kind === "group"
            ? "group_messages"
            : "community_messages",
        target.messageId,
        "error",
      );
      onComplete?.();
    }
  })();
}

export function moderateProfileInBackground(
  target: ProfileModerationTarget,
  onComplete?: () => void,
) {
  void (async () => {
    try {
      if (!supabase) {
        return;
      }

      const results = await checkContentBatch([
        {
          key: "headline",
          subjectType: "profile_headline",
          content: target.headline,
          subjectId: target.profileId,
          sourceTable: "profiles",
          sourceColumn: "headline",
        },
        {
          key: "bio",
          subjectType: "profile_bio",
          content: target.bio,
          subjectId: target.profileId,
          sourceTable: "profiles",
          sourceColumn: "bio",
        },
      ]);

      await supabase
        .from("profiles")
        .update({
          headline_moderation_outcome: results.headline?.verdict ?? "allowed",
          bio_moderation_outcome: results.bio?.verdict ?? "allowed",
        })
        .eq("id", target.profileId);

      onComplete?.();
    } catch {
      if (supabase) {
        await supabase
          .from("profiles")
          .update({
            headline_moderation_outcome: "error",
            bio_moderation_outcome: "error",
          })
          .eq("id", target.profileId);
      }
      onComplete?.();
    }
  })();
}

export function moderateContainerInBackground(
  target: ContainerModerationTarget,
  onComplete?: () => void,
) {
  void (async () => {
    try {
      const items: ModerationBatchItem[] =
        target.kind === "group"
          ? [
              {
                key: "name",
                subjectType: "group_name",
                content: target.name,
                subjectId: target.id,
                sourceTable: "groups",
                sourceColumn: "name",
              },
              {
                key: "description",
                subjectType: "group_description",
                content: target.description,
                subjectId: target.id,
                sourceTable: "groups",
                sourceColumn: "description",
              },
            ]
          : [
              {
                key: "name",
                subjectType: "community_name",
                content: target.name,
                subjectId: target.id,
                sourceTable: "communities",
                sourceColumn: "name",
              },
              {
                key: "description",
                subjectType: "community_description",
                content: target.description,
                subjectId: target.id,
                sourceTable: "communities",
                sourceColumn: "description",
              },
              ...target.tags.map((tag, index) => ({
                key: `tag-${index}`,
                subjectType: "community_tag" as const,
                content: tag,
                subjectId: target.id,
                sourceTable: "communities",
                sourceColumn: "tags",
              })),
            ];

      const results = await checkContentBatch(items);
      await updateTableOutcome(
        target.kind === "group" ? "groups" : "communities",
        target.id,
        getAggregateModerationVerdict(results),
      );
      onComplete?.();
    } catch {
      await updateTableOutcome(
        target.kind === "group" ? "groups" : "communities",
        target.id,
        "error",
      );
      onComplete?.();
    }
  })();
}
