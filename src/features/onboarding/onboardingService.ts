import { isSupabaseConfigured, supabase } from "@lib/supabase";
import type { StudyMode, StudyStyle, UserProfile } from "@appTypes/index";
import { normalizeInterestTags, normalizeProfileTags } from "@utils/interestTags";
import type { SelectedModule } from "./types";

type AcademicProfileInput = {
  faculty: string;
  major: string;
  yearOfStudy: number;
  selectedModules: SelectedModule[];
  semester: string;
};

type ProfileSetupInput = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
};

type FileUpload = {
  base64: string;
  uri: string;
};

async function getUserId() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You need to be logged in to continue onboarding.");
  }

  return data.user.id;
}

export async function saveAcademicProfile(input: AcademicProfileInput) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const userId = await getUserId();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      faculty: input.faculty.trim(),
      major: input.major.trim(),
      year_of_study: input.yearOfStudy,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: deleteError } = await supabase
    .from("user_modules")
    .delete()
    .eq("user_id", userId)
    .eq("semester", input.semester);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  for (const selectedModule of input.selectedModules) {
    const { error } = await supabase.rpc("upsert_user_module", {
      module_code_input: selectedModule.moduleCode,
      module_name_input: selectedModule.title,
      module_department_input: selectedModule.department,
      module_faculty_input: selectedModule.faculty,
      semester_input: input.semester,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

function getUploadMetadata(uri: string) {
  const extension = uri.split(".").pop()?.split("?")[0]?.toLowerCase();

  if (extension === "png") {
    return { extension, contentType: "image/png" };
  }

  if (extension === "webp") {
    return { extension, contentType: "image/webp" };
  }

  return { extension: "jpg", contentType: "image/jpeg" };
}

function decodeBase64(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function uploadProfileImage(file: FileUpload) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const userId = await getUserId();
  const metadata = getUploadMetadata(file.uri);
  const filePath = `${userId}/profile-${Date.now()}.${metadata.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, decodeBase64(file.base64), {
      contentType: metadata.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
}

export async function saveProfileSetup(input: ProfileSetupInput): Promise<UserProfile> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const userId = await getUserId();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      avatar_url: input.avatarUrl,
      bio: input.bio.trim(),
      display_name: input.displayName.trim(),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const studyStyle =
    data.study_style === "online" ||
    data.study_style === "in_person" ||
    data.study_style === "flexible"
      ? (data.study_style as StudyStyle)
      : null;
  const studyMode =
    data.study_mode === "online" ||
    data.study_mode === "in_person" ||
    data.study_mode === "flexible"
      ? (data.study_mode as StudyMode)
      : null;

  return {
    ...data,
    intents: data.intents ?? [],
    interests: normalizeInterestTags(data.interests ?? []),
    cca_tags: normalizeProfileTags(data.cca_tags ?? []),
    skills: normalizeProfileTags(data.skills ?? []),
    study_mode: studyMode,
    study_style: studyStyle,
  };
}
