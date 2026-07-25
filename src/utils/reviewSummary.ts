import type { ProfileReviewSummary } from "@appTypes/index";

const CATEGORY_LABELS = {
  communication_average: "communication",
  contribution_average: "contribution",
  reliability_average: "reliability",
} as const;

type CategoryKey = keyof typeof CATEGORY_LABELS;

export function buildProfileReviewSummaryLine(
  summary: ProfileReviewSummary | null,
): string {
  if (!summary || summary.received_review_count === 0) {
    return "No reviews yet.";
  }

  const ranked = (Object.keys(CATEGORY_LABELS) as CategoryKey[])
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      value: summary[key] ?? 0,
    }))
    .sort((left, right) => right.value - left.value);

  const first = ranked[0];
  const second = ranked[1];

  if (!first || first.value <= 0) {
    return "Groupmates have started leaving reviews.";
  }

  if (second && Math.abs(first.value - second.value) < 0.15) {
    return `Groupmates most often highlight your ${first.label} and ${second.label}.`;
  }

  return `Groupmates most often highlight your ${first.label}.`;
}
