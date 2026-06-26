import assert from "node:assert/strict";
import test from "node:test";

import { getDiscoverGroupAccess } from "./groupAccess.ts";

const baseGroup = {
  creator_id: "owner-1",
  privacy: "public" as const,
  joined: false,
  can_join: true,
  request_pending: false,
};

test("allows eligible students to join public or visible restricted groups", () => {
  assert.deepEqual(getDiscoverGroupAccess(baseGroup, "user-1"), {
    isOwner: false,
    actionLabel: "Join group",
    canRequestPrivateGroup: false,
    canJoinVisibleGroup: true,
    isActionDisabled: false,
  });
});

test("locks semi-private groups when the user does not satisfy visibility rules", () => {
  assert.deepEqual(
    getDiscoverGroupAccess(
      {
        ...baseGroup,
        privacy: "semi_private",
        can_join: false,
      },
      "user-1",
    ),
    {
      isOwner: false,
      actionLabel: "Locked",
      canRequestPrivateGroup: false,
      canJoinVisibleGroup: false,
      isActionDisabled: true,
    },
  );
});

test("uses request states for private invite-only groups", () => {
  assert.deepEqual(
    getDiscoverGroupAccess(
      {
        ...baseGroup,
        privacy: "private",
        can_join: false,
      },
      "user-1",
    ),
    {
      isOwner: false,
      actionLabel: "Request to join",
      canRequestPrivateGroup: true,
      canJoinVisibleGroup: false,
      isActionDisabled: false,
    },
  );

  assert.deepEqual(
    getDiscoverGroupAccess(
      {
        ...baseGroup,
        privacy: "private",
        can_join: false,
        request_pending: true,
      },
      "user-1",
    ),
    {
      isOwner: false,
      actionLabel: "Requested",
      canRequestPrivateGroup: false,
      canJoinVisibleGroup: false,
      isActionDisabled: true,
    },
  );
});

test("prevents owners and existing members from using the join CTA", () => {
  assert.equal(getDiscoverGroupAccess(baseGroup, "owner-1").isOwner, true);
  assert.equal(
    getDiscoverGroupAccess(baseGroup, "owner-1").isActionDisabled,
    true,
  );

  const joinedAccess = getDiscoverGroupAccess(
    {
      ...baseGroup,
      joined: true,
    },
    "user-1",
  );

  assert.equal(joinedAccess.actionLabel, "Joined");
  assert.equal(joinedAccess.isActionDisabled, true);
});
