import { INTEREST_TAG_OPTIONS } from "@constants/index";

export function normalizeInterestTag(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function normalizeProfileTag(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, " ");
}

export function normalizeInterestTags(interests: string[]) {
  const deduped = new Set<string>();

  interests.forEach((interest) => {
    const normalized = normalizeInterestTag(interest);

    if (!normalized) {
      return;
    }

    deduped.add(normalized);
  });

  return Array.from(deduped).sort((left, right) => {
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

export function normalizeProfileTags(tags: string[]) {
  const deduped = new Set<string>();

  tags.forEach((tag) => {
    const normalized = normalizeProfileTag(tag);

    if (!normalized) {
      return;
    }

    deduped.add(normalized);
  });

  return Array.from(deduped).sort((left, right) => left.localeCompare(right));
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
