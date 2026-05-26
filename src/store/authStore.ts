import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@lib/supabase";
import type { Database } from "@appTypes/database";
import type { UserProfile } from "@appTypes/index";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isInitialized: boolean;
  isProfileLoading: boolean;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setInitialized: (isInitialized: boolean) => void;
  clearProfile: () => void;
  refreshProfile: (userId?: string) => Promise<UserProfile | null>;
  completeOnboarding: (payload: {
    interests: string[];
    intents: UserProfile["intents"];
  }) => Promise<UserProfile>;
}

function mapProfileRowToUserProfile(
  row: Database["public"]["Tables"]["profiles"]["Row"],
): UserProfile {
  return {
    ...row,
    intents: row.intents ?? [],
    interests: row.interests ?? [],
    skills: row.skills ?? [],
  };
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

    set({ session });

    if (session?.user) {
      await get().refreshProfile(session.user.id);
    }

    set({ isInitialized: true });
  },

  setSession(session) {
    set({ session });
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

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", nextUserId)
      .single();

    if (error) {
      set({ isProfileLoading: false });
      throw error;
    }

    const profile = mapProfileRowToUserProfile(data);
    set({ profile, isProfileLoading: false });
    return profile;
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
      interests: payload.interests,
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
}));
