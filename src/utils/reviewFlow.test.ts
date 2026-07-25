import assert from "node:assert/strict";
import test from "node:test";

import {
  canSubmitGroupReview,
  createGroupReviewEligibilityErrorState,
  formatGroupReviewEligibilityReason,
  getEligibleLeavePromptMembers,
  getReviewSubmissionErrorAlertCopy,
  resolveGroupReviewEligibilityState,
} from "./reviewFlow.ts";

test("formats not-yet-eligible review reasons with the eligible date", () => {
  assert.equal(
    formatGroupReviewEligibilityReason({
      is_eligible: false,
      reason: "Not enough shared membership time yet",
      eligible_at: "2026-07-28T00:00:00.000Z",
    }),
    "Eligible from 28 Jul",
  );
});

test("resolves reviewed and eligible states explicitly", () => {
  const reviewed = resolveGroupReviewEligibilityState({
    eligibility: {
      is_eligible: false,
      reason: "Review updated recently",
      eligible_at: "2026-07-30T00:00:00.000Z",
    },
    alreadyReviewed: true,
  });
  const eligible = resolveGroupReviewEligibilityState({
    eligibility: {
      is_eligible: true,
      reason: "Eligible to review",
      eligible_at: null,
    },
    alreadyReviewed: false,
  });

  assert.equal(reviewed.status, "reviewed");
  assert.equal(eligible.status, "eligible");
});

test("formats review cooldown reasons with the next update date", () => {
  assert.equal(
    formatGroupReviewEligibilityReason({
      is_eligible: false,
      reason: "Review updated recently",
      eligible_at: "2026-07-30T00:00:00.000Z",
    }),
    "Can update again from 30 Jul",
  );
});

test("creates an explicit error eligibility state", () => {
  const state = createGroupReviewEligibilityErrorState(
    "We could not confirm review status.",
  );

  assert.equal(state.status, "error");
  assert.equal(state.displayReason, "We could not confirm review status.");
  assert.equal(state.errorMessage, "We could not confirm review status.");
});

test("filters leave prompt members down to eligible-only rows", () => {
  const members = getEligibleLeavePromptMembers([
    {
      member: { id: "eligible-user" },
      state: resolveGroupReviewEligibilityState({
        eligibility: {
          is_eligible: true,
          reason: "Eligible to review",
          eligible_at: null,
        },
        alreadyReviewed: false,
      }),
    },
    {
      member: { id: "reviewed-user" },
      state: resolveGroupReviewEligibilityState({
        eligibility: {
          is_eligible: false,
          reason: "Review updated recently",
          eligible_at: "2026-07-30T00:00:00.000Z",
        },
        alreadyReviewed: true,
      }),
    },
    {
      member: { id: "not-yet-user" },
      state: resolveGroupReviewEligibilityState({
        eligibility: {
          is_eligible: false,
          reason: "Not enough shared membership time yet",
          eligible_at: "2026-07-30T00:00:00.000Z",
        },
        alreadyReviewed: false,
      }),
    },
  ]);

  assert.deepEqual(members, [{ id: "eligible-user" }]);
});

test("requires all three ratings before the review composer can submit", () => {
  assert.equal(
    canSubmitGroupReview(
      {
        reliability: 5,
        communication: 4,
        contribution: 3,
      },
      { group_id: "group-1" },
      false,
    ),
    true,
  );

  assert.equal(
    canSubmitGroupReview(
      {
        reliability: 5,
        communication: 0,
        contribution: 3,
      },
      { group_id: "group-1" },
      false,
    ),
    false,
  );
});

test("classifies network review submission failures separately", () => {
  const networkCopy = getReviewSubmissionErrorAlertCopy(
    new Error("Network request failed"),
  );
  const backendCopy = getReviewSubmissionErrorAlertCopy(
    new Error("Not enough shared membership time yet"),
  );

  assert.equal(networkCopy.title, "Network issue");
  assert.equal(backendCopy.title, "Could not submit review");
  assert.equal(backendCopy.message, "Not enough shared membership time yet");
});
