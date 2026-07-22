type GroupReviewEligibilityStatus =
  | "loading"
  | "eligible"
  | "notYet"
  | "reviewed"
  | "error";

type GroupReviewEligibilityLike = {
  is_eligible: boolean;
  reason: string;
  eligible_at: string | null;
};

type ReviewableGroupMemberLike = {
  id: string;
};

type ReviewComposerTargetLike = {
  group_id: string;
};

export type GroupReviewEligibilityState = {
  status: Exclude<GroupReviewEligibilityStatus, "loading">;
  eligibility: GroupReviewEligibilityLike | null;
  alreadyReviewed: boolean;
  displayReason: string;
  errorMessage: string | null;
};

type ResolveEligibilityStateInput = {
  eligibility: GroupReviewEligibilityLike;
  alreadyReviewed: boolean;
};

type LeavePromptCandidate<TMember extends ReviewableGroupMemberLike> = {
  member: TMember;
  state: GroupReviewEligibilityState;
};

type ReviewComposerRatings = {
  reliability: number;
  communication: number;
  contribution: number;
};

const NETWORK_ERROR_PATTERNS = [
  /network request failed/i,
  /failed to fetch/i,
  /network/i,
  /timed out/i,
];

export function formatGroupReviewEligibilityReason(
  eligibility: GroupReviewEligibilityLike,
): string {
  if (
    eligibility.is_eligible ||
    !eligibility.eligible_at ||
    eligibility.reason !== "Not enough shared membership time yet"
  ) {
    return eligibility.reason;
  }

  const eligibleDate = new Intl.DateTimeFormat("en-SG", {
    month: "short",
    day: "numeric",
  }).format(new Date(eligibility.eligible_at));

  return `Eligible from ${eligibleDate}`;
}

export function resolveGroupReviewEligibilityState({
  eligibility,
  alreadyReviewed,
}: ResolveEligibilityStateInput): GroupReviewEligibilityState {
  return {
    status: alreadyReviewed
      ? "reviewed"
      : eligibility.is_eligible
        ? "eligible"
        : "notYet",
    eligibility,
    alreadyReviewed,
    displayReason: formatGroupReviewEligibilityReason(eligibility),
    errorMessage: null,
  };
}

export function createGroupReviewEligibilityErrorState(
  message = "Could not load review eligibility right now.",
): GroupReviewEligibilityState {
  return {
    status: "error",
    eligibility: null,
    alreadyReviewed: false,
    displayReason: message,
    errorMessage: message,
  };
}

export function getEligibleLeavePromptMembers<
  TMember extends ReviewableGroupMemberLike,
>(candidates: LeavePromptCandidate<TMember>[]): TMember[] {
  return candidates
    .filter((candidate) => candidate.state.status === "eligible")
    .map((candidate) => candidate.member);
}

export function getReviewEligibilityAlertCopy(reason: string) {
  return {
    title: "Not eligible yet",
    message: reason || "You cannot review this member yet.",
  };
}

export function getReviewRowErrorAlertCopy(message: string) {
  return {
    title: "Review unavailable",
    message: message || "We could not load review eligibility right now.",
  };
}

export function getReviewSubmissionErrorAlertCopy(error: unknown) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Please try again.";

  if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return {
      title: "Network issue",
      message:
        "Your review was not submitted because the network request failed. Please try again.",
    };
  }

  return {
    title: "Could not submit review",
    message,
  };
}

export function getReviewSubmittedAlertCopy() {
  return {
    title: "Review submitted",
    message: "Thanks. Your review has been saved for this group.",
  };
}

export function getReviewRefreshFailureAlertCopy() {
  return {
    title: "Review submitted",
    message:
      "Your review was saved, but we could not refresh the group info right now. Reopen the chat info page if the status does not update.",
  };
}

export function canSubmitGroupReview(
  ratings: ReviewComposerRatings,
  target: ReviewComposerTargetLike | null,
  isSubmitting: boolean,
) {
  return (
    ratings.reliability > 0 &&
    ratings.communication > 0 &&
    ratings.contribution > 0 &&
    !isSubmitting &&
    target !== null
  );
}
