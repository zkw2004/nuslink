import { supabase } from "@lib/supabase";
import type {
  GroupReviewEligibility,
  GroupReviewInput,
  ProfileReviewSummary,
  PublicProfileReview,
} from "@appTypes/index";

export type GroupReviewEligibilityResult = GroupReviewEligibility & {
  already_reviewed: boolean;
  display_reason: string;
};

export type SubmittedGroupReview = {
  id: string;
  group_id: string;
  reviewee_id: string;
};

function formatEligibilityReason(
  eligibility: GroupReviewEligibility,
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

export async function getGroupReviewEligibility(
  groupId: string,
  revieweeId: string,
): Promise<GroupReviewEligibilityResult> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You need to be signed in to review a group member.");
  }

  const [
    { data: eligibilityRows, error: eligibilityError },
    { count: existingReviewCount, error: existingReviewError },
  ] = await Promise.all([
    supabase.rpc("get_group_review_eligibility", {
      group_id_input: groupId,
      reviewee_id_input: revieweeId,
    }),
    supabase
      .from("group_reviews")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId),
  ]);

  if (eligibilityError) {
    throw new Error(eligibilityError.message);
  }

  if (existingReviewError) {
    throw new Error(existingReviewError.message);
  }

  const eligibility = eligibilityRows?.[0] as GroupReviewEligibility | undefined;

  if (!eligibility) {
    throw new Error("Could not load review eligibility right now.");
  }

  return {
    ...eligibility,
    already_reviewed: (existingReviewCount ?? 0) > 0,
    display_reason: formatEligibilityReason(eligibility),
  };
}

export async function submitGroupReview(
  input: GroupReviewInput,
): Promise<SubmittedGroupReview> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("submit_group_review", {
    group_id_input: input.group_id,
    reviewee_id_input: input.reviewee_id,
    reliability_input: input.reliability_score,
    communication_input: input.communication_score,
    contribution_input: input.contribution_score,
    written_review_input: input.written_review?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data,
    group_id: input.group_id,
    reviewee_id: input.reviewee_id,
  };
}

export async function listProfileReviews(
  profileId: string,
  limit = 20,
  offset = 0,
): Promise<PublicProfileReview[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("list_profile_reviews", {
    profile_id_input: profileId,
    limit_input: limit,
    offset_input: offset,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getProfileReviewSummary(
  profileId: string,
): Promise<ProfileReviewSummary | null> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("get_profile_review_summary", {
    profile_id_input: profileId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}
