import assert from "node:assert/strict";
import test from "node:test";

import { buildUnifiedInboxItems, formatGroupTypeLabel } from "./chatInbox.ts";

test("formats group type labels for inbox subtitles", () => {
  assert.equal(formatGroupTypeLabel("study_group"), "Study Group");
  assert.equal(formatGroupTypeLabel("hackathon_team"), "Hackathon Team");
});

test("merges direct, group, and community chats into one sorted inbox", () => {
  const items = buildUnifiedInboxItems({
    conversations: [
      {
        id: "direct-1",
        other_user: {
          id: "user-2",
          display_name: "Kaiwen",
          avatar_url: "https://example.com/avatar.png",
          major: "Computer Science",
          year_of_study: 2,
          badge_tier: "gold",
        },
        last_message_preview: "See you at COM3",
        last_message_at: "2026-06-22T08:30:00.000Z",
        updated_at: "2026-06-22T08:00:00.000Z",
        unread_count: 2,
      },
    ],
    groupChats: [
      {
        id: "group-1",
        name: "CS2040S Midterm Prep",
        type: "study_group",
        module_code: "CS2040S",
        privacy: "public",
        semester: "AY2526S2",
        created_at: "2026-06-21T10:00:00.000Z",
        last_message_preview: null,
        last_message_at: null,
        unread_count: 0,
      },
    ],
    communityChats: [
      {
        id: "community-1",
        name: "NUS Builders",
        description: "Build projects together",
        type: "user_created",
        join_policy: "open",
        tags: ["projects"],
        creator_id: "user-1",
        created_at: "2026-06-20T09:00:00.000Z",
        last_message_preview: "Demo night on Friday",
        last_message_at: "2026-06-22T09:00:00.000Z",
        unread_count: 4,
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => `${item.kind}:${item.id}`),
    ["community:community-1", "direct:direct-1", "group:group-1"],
  );
  assert.deepEqual(items[0], {
    id: "community-1",
    kind: "community",
    title: "NUS Builders",
    subtitle: "Community chat",
    preview: "Demo night on Friday",
    timestamp: "2026-06-22T09:00:00.000Z",
    sortTimestamp: "2026-06-22T09:00:00.000Z",
    unreadCount: 4,
    roundedAvatar: false,
  });
  assert.equal(items[1].preview, "See you at COM3");
  assert.equal(items[1].avatarUri, "https://example.com/avatar.png");
  assert.equal(items[2].subtitle, "CS2040S · Study Group");
  assert.equal(items[2].preview, "No messages yet. Start the group chat.");
});

test("uses honest empty previews for chats without messages", () => {
  const items = buildUnifiedInboxItems({
    conversations: [
      {
        id: "direct-1",
        other_user: {
          id: "user-2",
          display_name: "Joel",
          avatar_url: null,
          major: null,
          year_of_study: null,
          badge_tier: null,
        },
        last_message_preview: null,
        last_message_at: null,
        updated_at: "2026-06-20T10:00:00.000Z",
        unread_count: 0,
      },
    ],
    groupChats: [],
    communityChats: [
      {
        id: "community-1",
        name: "NUS Builders",
        description: "Build projects together",
        type: "user_created",
        join_policy: "open",
        tags: [],
        creator_id: "user-1",
        created_at: "2026-06-19T10:00:00.000Z",
        last_message_preview: null,
        last_message_at: null,
        unread_count: 0,
      },
    ],
  });

  assert.equal(items[0].preview, "Start the conversation here.");
  assert.equal(
    items[1].preview,
    "No messages yet. Start the community conversation.",
  );
});
