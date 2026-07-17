import { api } from "@lib/api";
import { normalizeInterestTags, normalizeProfileTags } from "@utils/interestTags";

type TagType = "interest" | "project" | "cca";

type TagNormalizationResult = {
  raw_tag: string;
  normalized_raw_tag: string | null;
  canonical_tags: string[];
  source: "rule" | "ai" | "passthrough";
  matched: boolean;
};

type TagNormalizationResponse = {
  results: TagNormalizationResult[];
};

function toStoredTags(results: TagNormalizationResult[]) {
  const deduped = new Set<string>();

  results.forEach((result) => {
    if (result.canonical_tags.length > 0) {
      result.canonical_tags.forEach((tag) => deduped.add(tag));
      return;
    }

    if (result.normalized_raw_tag) {
      deduped.add(result.normalized_raw_tag);
    }
  });

  return Array.from(deduped);
}

async function normalizeTags(tagType: TagType, rawTags: string[]) {
  if (rawTags.length === 0) {
    return [];
  }

  const response = await api.post<TagNormalizationResponse>("/v1/tags/normalize", {
    tag_type: tagType,
    raw_tags: rawTags,
    allow_ai_fallback: true,
  });

  return toStoredTags(response.results);
}

export async function normalizeInterestTagsForSave(rawTags: string[]) {
  const normalized = await normalizeTags("interest", rawTags);
  return normalizeInterestTags(normalized);
}

export async function normalizeCcaTagsForSave(rawTags: string[]) {
  const normalized = await normalizeTags("cca", rawTags);
  return normalizeProfileTags(normalized);
}
