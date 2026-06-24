import { create } from "zustand";

import type { Intent } from "@appTypes/index";
import type { SelectedModule } from "@features/onboarding/types";
import { normalizeInterestTags } from "@utils/interestTags";

type AcademicDraft = {
  faculty: string;
  major: string;
  yearOfStudy: number;
  selectedModules: SelectedModule[];
};

type ProfileDraft = {
  displayName: string;
  bio: string;
  avatarUri: string | null;
  avatarBase64: string | null;
  avatarUrl: string | null;
};

interface OnboardingState {
  academicDraft: AcademicDraft;
  profileDraft: ProfileDraft;
  interests: string[];
  intents: Intent[];
  setAcademicDraft: (draft: Partial<AcademicDraft>) => void;
  setProfileDraft: (draft: Partial<ProfileDraft>) => void;
  setInterests: (interests: string[]) => void;
  setIntents: (intents: Intent[]) => void;
  reset: () => void;
}

const initialAcademicDraft: AcademicDraft = {
  faculty: "",
  major: "",
  yearOfStudy: 1,
  selectedModules: [],
};

const initialProfileDraft: ProfileDraft = {
  displayName: "",
  bio: "",
  avatarUri: null,
  avatarBase64: null,
  avatarUrl: null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  academicDraft: initialAcademicDraft,
  profileDraft: initialProfileDraft,
  interests: [],
  intents: [],
  setAcademicDraft(draft) {
    set((state) => ({
      academicDraft: {
        ...state.academicDraft,
        ...draft,
      },
    }));
  },
  setProfileDraft(draft) {
    set((state) => ({
      profileDraft: {
        ...state.profileDraft,
        ...draft,
      },
    }));
  },
  setInterests(interests) {
    set({ interests: normalizeInterestTags(interests) });
  },
  setIntents(intents) {
    set({ intents });
  },
  reset() {
    set({
      academicDraft: initialAcademicDraft,
      profileDraft: initialProfileDraft,
      interests: [],
      intents: [],
    });
  },
}));
