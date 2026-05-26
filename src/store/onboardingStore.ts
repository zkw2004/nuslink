import { create } from "zustand";

import type { Intent } from "@appTypes/index";

interface OnboardingState {
  interests: string[];
  intents: Intent[];
  setInterests: (interests: string[]) => void;
  setIntents: (intents: Intent[]) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  interests: [],
  intents: [],
  setInterests(interests) {
    set({ interests });
  },
  setIntents(intents) {
    set({ intents });
  },
  reset() {
    set({ interests: [], intents: [] });
  },
}));
