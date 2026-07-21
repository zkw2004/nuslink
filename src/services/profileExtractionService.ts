import { api } from "@lib/api";
import { supabase } from "@lib/supabase";
import type {
  ProfileEntry,
  ProfileEntryCategory,
  ProfileLink,
  ProfileLinkLabel,
  UserProfile,
} from "@appTypes/index";
import {
  normalizeInterestTags,
  normalizeProfileTags,
} from "@utils/interestTags";

export type ExtractedProfileItem = {
  value: string;
  evidence: string | null;
};

export type ExtractedProfileLink = {
  label: ProfileLinkLabel;
  url: string;
  evidence: string | null;
};

export type ExtractedProfileEntry = {
  category: ProfileEntryCategory;
  title: string;
  organization: string | null;
  date_label: string | null;
  description: string | null;
  evidence: string | null;
};

export type ProfileExtractionDraft = {
  suggested_bio: string | null;
  skills: ExtractedProfileItem[];
  interests: ExtractedProfileItem[];
  cca_tags: ExtractedProfileItem[];
  professional_links: ExtractedProfileLink[];
  entries: ExtractedProfileEntry[];
  warnings: string[];
};

export type ProfileImportSelection = {
  bio: string | null;
  skills: string[] | null;
  interests: string[] | null;
  ccaTags: string[] | null;
  links: (ExtractedProfileLink & { isVisible: boolean })[];
  entries: (ExtractedProfileEntry & { isVisible: boolean })[];
};

export type ProfessionalProfile = {
  links: ProfileLink[];
  entries: ProfileEntry[];
};

export function extractProfileFromResume(input: {
  filename: string;
  mimeType: string;
  fileBase64: string;
}) {
  return api.post<ProfileExtractionDraft>("/v1/profiles/extract", {
    filename: input.filename,
    mime_type: input.mimeType,
    file_base64: input.fileBase64,
  });
}

export async function applyProfileImport(
  profile: UserProfile,
  selection: ProfileImportSelection,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const mergedSkills =
    selection.skills === null
      ? null
      : normalizeProfileTags([...profile.skills, ...selection.skills]);
  const mergedInterests =
    selection.interests === null
      ? null
      : normalizeInterestTags([...profile.interests, ...selection.interests]);
  const mergedCcaTags =
    selection.ccaTags === null
      ? null
      : normalizeProfileTags([...profile.cca_tags, ...selection.ccaTags]);

  const { error } = await supabase.rpc("apply_profile_import", {
    bio_input: selection.bio?.trim() || null,
    skills_input: mergedSkills,
    interests_input: mergedInterests,
    cca_tags_input: mergedCcaTags,
    links_input: selection.links.map((link) => ({
      label: link.label,
      url: link.url.trim(),
      is_visible: link.isVisible,
    })),
    entries_input: selection.entries.map((entry) => ({
      category: entry.category,
      title: entry.title.trim(),
      organization: entry.organization?.trim() || null,
      date_label: entry.date_label?.trim() || null,
      description: entry.description?.trim() || null,
      is_visible: entry.isVisible,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchProfessionalProfile(
  userId: string,
): Promise<ProfessionalProfile> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [linksResult, entriesResult] = await Promise.all([
    supabase
      .from("profile_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profile_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (linksResult.error) {
    throw new Error(linksResult.error.message);
  }

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }

  return {
    links: linksResult.data,
    entries: entriesResult.data,
  };
}

export async function setProfileLinkVisibility(
  linkId: string,
  isVisible: boolean,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("profile_links")
    .update({ is_visible: isVisible })
    .eq("id", linkId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setProfileEntryVisibility(
  entryId: string,
  isVisible: boolean,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("profile_entries")
    .update({ is_visible: isVisible })
    .eq("id", entryId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProfileLink(linkId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("profile_links")
    .delete()
    .eq("id", linkId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProfileEntry(entryId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("profile_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertPrimaryProfessionalLink(
  userId: string,
  url: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedUrl = url.trim();
  const { data: existingLinks, error: fetchError } = await supabase
    .from("profile_links")
    .select("id, label")
    .eq("user_id", userId)
    .in("label", ["portfolio", "other"])
    .order("created_at", { ascending: true });

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const primaryLink = existingLinks[0] ?? null;

  if (!trimmedUrl) {
    if (primaryLink) {
      const { error: deleteError } = await supabase
        .from("profile_links")
        .delete()
        .eq("id", primaryLink.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    return;
  }

  if (primaryLink) {
    const { error: updateError } = await supabase
      .from("profile_links")
      .update({
        url: trimmedUrl,
        label: primaryLink.label,
      })
      .eq("id", primaryLink.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: insertError } = await supabase.from("profile_links").insert({
    user_id: userId,
    label: "portfolio",
    url: trimmedUrl,
    is_visible: false,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}
