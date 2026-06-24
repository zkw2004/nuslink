import {
  INTEREST_TAG_OPTIONS,
  MAX_CUSTOM_INTEREST_TAGS,
} from "@constants/index";

function normalizeInterestKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const CANONICAL_INTEREST_MAP = new Map<string, string>(
  [
    ["ai / ml", "AI / ML"],
    ["ai/ml", "AI / ML"],
    ["ai", "AI / ML"],
    ["a.i.", "AI / ML"],
    ["artificial intelligence", "AI / ML"],
    ["machine learning", "AI / ML"],
    ["software engineering", "Software Engineering"],
    ["software eng", "Software Engineering"],
    ["data science", "Data Science"],
    ["cybersecurity", "Cybersecurity"],
    ["cyber security", "Cybersecurity"],
    ["systems", "Systems"],
    ["algorithms", "Algorithms"],
    ["product management", "Product Management"],
    ["product", "Product Management"],
    ["entrepreneurship", "Entrepreneurship"],
    ["design", "Design"],
    ["research", "Research"],
    ["economics", "Economics"],
    ["finance", "Finance"],
    ["consulting", "Consulting"],
    ["marketing", "Marketing"],
    ["operations", "Operations"],
    ["public policy", "Public Policy"],
  ].map(([alias, canonical]) => [normalizeInterestKey(alias), canonical]),
);

function formatCustomInterest(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeInterestTag(value: string) {
  const formatted = formatCustomInterest(value);

  if (!formatted) {
    return null;
  }

  return CANONICAL_INTEREST_MAP.get(normalizeInterestKey(formatted)) ?? formatted;
}

export function normalizeInterestTags(interests: string[]) {
  const deduped = new Map<string, string>();

  interests.forEach((interest) => {
    const normalized = normalizeInterestTag(interest);

    if (!normalized) {
      return;
    }

    deduped.set(normalizeInterestKey(normalized), normalized);
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftCanonicalIndex = INTEREST_TAG_OPTIONS.indexOf(
      left as (typeof INTEREST_TAG_OPTIONS)[number],
    );
    const rightCanonicalIndex = INTEREST_TAG_OPTIONS.indexOf(
      right as (typeof INTEREST_TAG_OPTIONS)[number],
    );

    if (leftCanonicalIndex !== -1 && rightCanonicalIndex !== -1) {
      return leftCanonicalIndex - rightCanonicalIndex;
    }

    if (leftCanonicalIndex !== -1) {
      return -1;
    }

    if (rightCanonicalIndex !== -1) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

export function isCanonicalInterestTag(interest: string) {
  return INTEREST_TAG_OPTIONS.includes(
    interest as (typeof INTEREST_TAG_OPTIONS)[number],
  );
}

export function splitInterestTags(interests: string[]) {
  const normalized = normalizeInterestTags(interests);

  return {
    canonical: normalized.filter(isCanonicalInterestTag),
    custom: normalized.filter((interest) => !isCanonicalInterestTag(interest)),
  };
}

export function canAddCustomInterest(interests: string[]) {
  return splitInterestTags(interests).custom.length < MAX_CUSTOM_INTEREST_TAGS;
}
