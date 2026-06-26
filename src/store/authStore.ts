import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@lib/supabase";
import type { Database } from "@appTypes/database";
import type { StudyStyle, UserProfile } from "@appTypes/index";
import { normalizeInterestTags } from "@utils/interestTags";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

const PROFILE_REQUEST_TIMEOUT_MS = 8000;

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isInitialized: boolean;
  isProfileLoading: boolean;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setInitialized: (isInitialized: boolean) => void;
  clearProfile: () => void;
  refreshProfile: (userId?: string) => Promise<UserProfile | null>;
  completeOnboarding: (payload: {
    interests: string[];
    intents: UserProfile["intents"];
  }) => Promise<UserProfile>;
  signOut: () => Promise<void>;
}

function mapProfileRowToUserProfile(
  row: ProfileRow,
): UserProfile {
  const studyStyle =
    row.study_style === "online" ||
    row.study_style === "in_person" ||
    row.study_style === "flexible"
      ? (row.study_style as StudyStyle)
      : null;

  return {
    ...row,
    intents: row.intents ?? [],
    interests: normalizeInterestTags(row.interests ?? []),
    skills: row.skills ?? [],
    study_style: studyStyle,
  };
}

async function ensureProfileRow(userId: string) {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insertPayload: ProfileInsert = {
    id: userId,
    display_name: user?.user_metadata?.full_name ?? "",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(insertPayload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, PROFILE_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isInitialized: false,
  isProfileLoading: false,

  async initialize() {
    if (get().isInitialized) {
      return;
    }

    if (!supabase) {
      set({ session: null, profile: null, isInitialized: true, isProfileLoading: false });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      if (session?.user) {
        await get().refreshProfile(session.user.id).catch(() => null);
      }
    } finally {
      set({ session, isInitialized: true });
    }
  },

  setSession(session) {
    set({ session });
  },

  setProfile(profile) {
    set({ profile, isProfileLoading: false });
  },

  setInitialized(isInitialized) {
    set({ isInitialized });
  },

  clearProfile() {
    set({ profile: null, isProfileLoading: false });
  },

  async refreshProfile(userId) {
    const nextUserId = userId ?? get().session?.user.id;

    if (!nextUserId) {
      set({ profile: null, isProfileLoading: false });
      return null;
    }

    if (!supabase) {
      set({ profile: null, isProfileLoading: false });
      return null;
    }

    set({ isProfileLoading: true });

    try {
      const { data, error } = await withTimeout(
        (async () =>
          supabase
            .from("profiles")
            .select("*")
            .eq("id", nextUserId)
            .single())(),
        "Profile request timed out.",
      );

      if (error) {
        if (error.code === "PGRST116") {
          const createdProfile = await withTimeout(
            ensureProfileRow(nextUserId),
            "Profile creation timed out.",
          );

          if (!createdProfile) {
            set({ profile: null, isProfileLoading: false });
            return null;
          }

          const profile = mapProfileRowToUserProfile(createdProfile);
          set({ profile, isProfileLoading: false });
          return profile;
        }

        throw error;
      }

      const profile = mapProfileRowToUserProfile(data);
      set({ profile, isProfileLoading: false });
      return profile;
    } catch (error) {
      set({ profile: null, isProfileLoading: false });
      throw error;
    }
  },

  async completeOnboarding(payload) {
    const userId = get().session?.user.id;

    if (!userId) {
      throw new Error("You must be signed in to complete onboarding.");
    }

    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    set({ isProfileLoading: true });

    const updates: ProfileUpdate = {
      interests: normalizeInterestTags(payload.interests),
      intents: payload.intents,
      onboarding_completed: true,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      set({ isProfileLoading: false });
      throw error;
    }

    const profile = mapProfileRowToUserProfile(data);
    set({ profile, isProfileLoading: false });
    return profile;
  },

  async signOut() {
    if (!supabase) {
      set({ session: null, profile: null, isProfileLoading: false });
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    set({ session: null, profile: null, isProfileLoading: false });
  },
}));
