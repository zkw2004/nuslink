import { api } from "@lib/api";
import { supabase } from "@lib/supabase";
import type { NudgePreferences } from "@appTypes/index";

export const DEFAULT_NUDGE_PREFERENCES: NudgePreferences = {
  time_enabled: true,
  behaviour_enabled: true,
  network_enabled: true,
};

export async function fetchNudgePreferences(
  userId: string,
): Promise<NudgePreferences> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("nudge_preferences")
    .select("time_enabled,behaviour_enabled,network_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? DEFAULT_NUDGE_PREFERENCES;
}

export async function updateNudgePreferences(
  userId: string,
  preferences: NudgePreferences,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("nudge_preferences").upsert({
    user_id: userId,
    ...preferences,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function evaluateSmartNudges() {
  return api.post<{ evaluated: boolean; created_count: number }>(
    "/v1/nudges/evaluate",
    {},
  );
}
