import { create } from "zustand";

import { fetchPeopleMatches } from "@services/matchingService";
import type { PeopleMatch } from "@appTypes/index";

interface MatchesState {
  peopleMatches: PeopleMatch[];
  availableModules: string[];
  semester: string | null;
  isLoading: boolean;
  error: string | null;
  refreshPeopleMatches: (moduleCode?: string) => Promise<void>;
  reset: () => void;
}

export const useMatchesStore = create<MatchesState>((set) => ({
  peopleMatches: [],
  availableModules: [],
  semester: null,
  isLoading: false,
  error: null,

  async refreshPeopleMatches(moduleCode) {
    set({ isLoading: true, error: null });

    try {
      const response = await fetchPeopleMatches(moduleCode);
      set({
        peopleMatches: response.candidates,
        availableModules: response.available_modules,
        semester: response.semester,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        peopleMatches: [],
        availableModules: [],
        semester: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load people matches right now.",
      });
    }
  },

  reset() {
    set({
      peopleMatches: [],
      availableModules: [],
      semester: null,
      isLoading: false,
      error: null,
    });
  },
}));
