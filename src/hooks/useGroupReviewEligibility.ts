import { useCallback, useEffect, useState } from "react";

import type { GroupReviewEligibilityStatus } from "@appTypes/index";
import {
  getGroupReviewEligibility,
  type GroupReviewEligibilityResult,
} from "@services/reviewService";

type Options = {
  enabled?: boolean;
  refreshToken?: number;
};

type State = {
  data: GroupReviewEligibilityResult | null;
  error: Error | null;
  loading: boolean;
};

export function useGroupReviewEligibility(
  groupId: string,
  revieweeId: string,
  options: Options = {},
) {
  const { enabled = true, refreshToken = 0 } = options;
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: enabled,
  });

  const load = useCallback(async () => {
    if (!enabled || !groupId || !revieweeId) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await getGroupReviewEligibility(groupId, revieweeId);
      setState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error("Could not load eligibility."),
        loading: false,
      });
    }
  }, [enabled, groupId, revieweeId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  let status: GroupReviewEligibilityStatus = "loading";

  if (!state.loading && state.data) {
    status = state.data.already_reviewed
      ? "reviewed"
      : state.data.is_eligible
        ? "eligible"
        : "notYet";
  }

  return {
    ...state,
    status,
    reason: state.data?.display_reason ?? state.data?.reason ?? "",
    eligibleAt: state.data?.eligible_at ?? null,
    refresh: load,
  };
}
