import assert from "node:assert/strict";
import test from "node:test";

import { classifyFastChatModeration } from "./moderation.ts";

test("blocks clear vulgar chat content before the AI moderation request", () => {
  assert.deepEqual(classifyFastChatModeration("what the fuck"), {
    outcome: "blocked",
    reason: "Contains clearly vulgar language.",
  });
  assert.deepEqual(classifyFastChatModeration("U fucking idiot"), {
    outcome: "blocked",
    reason: "Targets another user with abusive profanity.",
  });
});

test("keeps ordinary chat content pending for AI moderation", () => {
  assert.deepEqual(classifyFastChatModeration("Anyone free to revise CS2040S?"), {
    outcome: "pending",
  });
});
