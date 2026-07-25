import assert from "node:assert/strict";
import test from "node:test";

import { buildProfileReviewSummaryLine } from "./reviewSummary.ts";

test("returns an honest empty state when there are no received reviews", () => {
  assert.equal(buildProfileReviewSummaryLine(null), "No reviews yet.");
});

test("highlights the strongest single review category", () => {
  assert.equal(
    buildProfileReviewSummaryLine({
      reviewee_id: "user-1",
      received_review_count: 4,
      written_review_count: 2,
      reliability_average: 4.8,
      communication_average: 4.1,
      contribution_average: 4.2,
      overall_average: 4.4,
      badge_tier: "bronze",
    }),
    "Groupmates most often highlight your reliability.",
  );
});

test("highlights two categories when they are effectively tied", () => {
  assert.equal(
    buildProfileReviewSummaryLine({
      reviewee_id: "user-1",
      received_review_count: 5,
      written_review_count: 3,
      reliability_average: 4.7,
      communication_average: 4.6,
      contribution_average: 4.0,
      overall_average: 4.4,
      badge_tier: "silver",
    }),
    "Groupmates most often highlight your reliability and communication.",
  );
});
