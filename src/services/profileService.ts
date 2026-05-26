import { supabase } from "@lib/supabase";
import { getCurrentSemester } from "@lib/nusmods";
import type { UserProfile } from "@appTypes/index";
import type { SelectedModule } from "@features/onboarding/types";

export type ProfileViewModel = {
  badgeTierLabel: "New" | "Reliable" | "Trusted" | "Standout";
  completion: number;
  currentSemesterLabel: string;
  modules: string[];
  profile: UserProfile;
};

type EditableProfileInput = {
  displayName: string;
  bio: string;
  faculty: string;
  major: string;
  yearOfStudy: number;
  interests: string[];
  intents: UserProfile["intents"];
  modules: SelectedModule[];
};

const COMPLETION_FIELDS: (keyof Pick<
  UserProfile,
  "display_name" | "bio" | "faculty" | "major" | "year_of_study" | "interests" | "intents"
>)[] = [
  "display_name",
  "bio",
  "faculty",
  "major",
  "year_of_study",
  "interests",
  "intents",
];

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

function calculateProfileCompletion(profile: UserProfile, modules: string[]) {
  const completedFields = COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== null && value !== "";
  }).length;

  const totalFields = COMPLETION_FIELDS.length + 1;
  const moduleScore = modules.length > 0 ? 1 : 0;

  return Math.round(((completedFields + moduleScore) / totalFields) * 100);
}

export async function fetchProfileViewModel(userId: string, profile: UserProfile) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();
  const { data, error } = await supabase
    .from("user_modules")
    .select("module_code")
    .eq("user_id", userId)
    .eq("semester", semester)
    .order("module_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const modules = data.map((module) => module.module_code);

  return {
    badgeTierLabel: toBadgeTierLabel(profile.badge_tier),
    completion: calculateProfileCompletion(profile, modules),
    currentSemesterLabel: semester,
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

export async function updateEditableProfile(
  userId: string,
  input: EditableProfileInput,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      bio: input.bio.trim(),
      faculty: input.faculty.trim(),
      major: input.major.trim(),
      year_of_study: input.yearOfStudy,
      interests: input.interests,
      intents: input.intents,
    })
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
}
