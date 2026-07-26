import { supabase } from "@lib/supabase";
import { getCurrentSemester } from "@lib/nusmods";
import type { Database } from "@appTypes/database";
import type {
  ModerationOutcome,
  StudyMode,
  StudyStyle,
  TimetableSlot,
  UserProfile,
} from "@appTypes/index";
import {
  normalizeInterestTag,
  normalizeProfileTags,
} from "@utils/interestTags";
import type { SelectedModule } from "@features/onboarding/types";
import { replaceCurrentSemesterTimetableSlots } from "./timetableService";
import {
  normalizeCcaTagsForSave,
  normalizeInterestTagsForSave,
} from "./tagNormalizationService";

export type ProfileViewModel = {
  badgeTierLabel: "New" | "Reliable" | "Trusted" | "Standout";
  completion: number;
  currentSemesterLabel: string;
  hasTimetable: boolean;
  modules: string[];
  profile: UserProfile;
};

type EditableProfileInput = {
  displayName: string;
  headline: string;
  bio: string;
  faculty: string;
  major: string;
  yearOfStudy: number;
  hallResidence: string;
  studyMode?: StudyMode | null;
  studyStyle: StudyStyle;
  preferredGroupSize: number;
  interests: string[];
  ccaTags?: string[];
  skills?: string[];
  intents: UserProfile["intents"];
  modules: SelectedModule[];
  timetableSlots: TimetableSlot[];
  headlineModerationOutcome?: ModerationOutcome;
  bioModerationOutcome?: ModerationOutcome;
};

function toBadgeTierLabel(tier: UserProfile["badge_tier"]): ProfileViewModel["badgeTierLabel"] {
  switch (tier) {
    case "gold":
      return "Standout";
    case "silver":
      return "Trusted";
    case "bronze":
      return "Reliable";
    default:
      return "New";
  }
}

function hasValue(value: string | number | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== "";
}

function calculateProfileCompletion(
  profile: UserProfile,
  modules: string[],
  hasTimetable: boolean,
) {
  const weights: { complete: boolean; weight: number }[] = [
    { complete: hasValue(profile.display_name), weight: 1 },
    { complete: hasValue(profile.headline), weight: 1 },
    { complete: hasValue(profile.bio), weight: 1 },
    { complete: hasValue(profile.faculty), weight: 1 },
    { complete: hasValue(profile.major), weight: 1 },
    { complete: hasValue(profile.year_of_study), weight: 1 },
    { complete: hasValue(profile.intents), weight: 2 },
    { complete: modules.length > 0, weight: 2 },
    { complete: hasValue(profile.skills), weight: 2 },
    { complete: hasTimetable, weight: 2 },
    { complete: hasValue(profile.interests), weight: 1 },
  ];

  const earned = weights.reduce(
    (total, item) => total + (item.complete ? item.weight : 0),
    0,
  );
  const max = weights.reduce((total, item) => total + item.weight, 0);

  return Math.round((earned / max) * 100);
}

export async function fetchProfileViewModel(userId: string, profile: UserProfile) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();
  const [{ data: modulesData, error }, { count, error: timetableError }] =
    await Promise.all([
      supabase
        .from("user_modules")
        .select("module_code")
        .eq("user_id", userId)
        .eq("semester", semester)
        .order("module_code", { ascending: true }),
      supabase
        .from("timetable_slots")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("semester", semester),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  if (timetableError) {
    throw new Error(timetableError.message);
  }

  const modules = modulesData.map((module) => module.module_code);
  const hasTimetable = (count ?? 0) > 0;

  return {
    badgeTierLabel: toBadgeTierLabel(profile.badge_tier),
    completion: calculateProfileCompletion(profile, modules, hasTimetable),
    currentSemesterLabel: semester,
    hasTimetable,
    modules,
    profile,
  };
}

export async function fetchCurrentSemesterModules(userId: string): Promise<SelectedModule[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();
  const { data: userModules, error: userModulesError } = await supabase
    .from("user_modules")
    .select("module_code")
    .eq("user_id", userId)
    .eq("semester", semester)
    .order("module_code", { ascending: true });

  if (userModulesError) {
    throw new Error(userModulesError.message);
  }

  const moduleCodes = userModules.map((module) => module.module_code);

  if (moduleCodes.length === 0) {
    return [];
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("code, name, faculty, department")
    .in("code", moduleCodes);

  if (modulesError) {
    throw new Error(modulesError.message);
  }

  const byCode = new Map(
    modules.map((module) => [
      module.code,
      {
        moduleCode: module.code,
        title: module.name,
        faculty: module.faculty,
        department: module.department,
      },
    ]),
  );

  return moduleCodes.map(
    (moduleCode) =>
      byCode.get(moduleCode) ?? {
        moduleCode,
        title: moduleCode,
        faculty: null,
        department: null,
      },
  );
}

export async function searchInterestTagSuggestions(query: string): Promise<string[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_interest_tags", {
    search_input: trimmedQuery,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeInterestTag(row.tag))
    .filter((suggestion): suggestion is string => Boolean(suggestion));
}

export async function updateEditableProfile(
  userId: string,
  input: EditableProfileInput,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();
  const normalizedInterests = await normalizeInterestTagsForSave(input.interests);
  const normalizedCcaTags =
    input.ccaTags !== undefined
      ? await normalizeCcaTagsForSave(input.ccaTags)
      : undefined;

  const profileUpdates: Database["public"]["Tables"]["profiles"]["Update"] = {
    display_name: input.displayName.trim(),
    headline: input.headline.trim() || null,
    headline_moderation_outcome: input.headlineModerationOutcome ?? "allowed",
    bio: input.bio.trim(),
    bio_moderation_outcome: input.bioModerationOutcome ?? "allowed",
    faculty: input.faculty.trim(),
    major: input.major.trim(),
    year_of_study: input.yearOfStudy,
    hall_residence: input.hallResidence.trim() || null,
    study_style: input.studyStyle,
    preferred_group_size: input.preferredGroupSize,
    interests: normalizedInterests,
    intents: input.intents,
  };

  if (input.studyMode !== undefined) {
    profileUpdates.study_mode = input.studyMode;
  }

  if (normalizedCcaTags !== undefined) {
    profileUpdates.cca_tags = normalizedCcaTags;
  }

  if (input.skills !== undefined) {
    profileUpdates.skills = normalizeProfileTags(input.skills);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: deleteError } = await supabase
    .from("user_modules")
    .delete()
    .eq("user_id", userId)
    .eq("semester", semester);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  for (const selectedModule of input.modules) {
    const { error } = await supabase.rpc("upsert_user_module", {
      module_code_input: selectedModule.moduleCode,
      module_name_input: selectedModule.title,
      module_department_input: selectedModule.department,
      module_faculty_input: selectedModule.faculty,
      semester_input: semester,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  await replaceCurrentSemesterTimetableSlots(userId, input.timetableSlots);
}
