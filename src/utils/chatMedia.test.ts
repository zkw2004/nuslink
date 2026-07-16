import assert from "node:assert/strict";
import test from "node:test";

import {
  extractLinksFromText,
  formatAttachmentSize,
  getCommunityMediaCollections,
  getDirectMediaCollections,
} from "./chatMedia.ts";

test("extracts unique links from chat text", () => {
  assert.deepEqual(
    extractLinksFromText(
      "Read https://example.com and https://nus.edu.sg then https://example.com again",
    ),
    ["https://example.com", "https://nus.edu.sg"],
  );
  assert.deepEqual(extractLinksFromText(null), []);
});

test("formats attachment sizes for inbox media panels", () => {
  assert.equal(formatAttachmentSize(null), null);
  assert.equal(formatAttachmentSize(512), "1 KB");
  assert.equal(formatAttachmentSize(1536), "2 KB");
  assert.equal(formatAttachmentSize(2.5 * 1024 * 1024), "2.5 MB");
});

test("builds direct message media collections", () => {
  const collections = getDirectMediaCollections([
    {
      id: "msg-1",
      conversation_id: "conversation-1",
      sender_id: "user-1",
      body: "Slides: https://example.com/slides",
      attachment_url: "https://files.example.com/photo.jpg",
      attachment_name: null,
      attachment_mime_type: "image/jpeg",
      attachment_size: 2048,
      attachment_kind: "image",
      created_at: "2026-06-20T10:00:00.000Z",
      deleted_at: null,
      edited_at: null,
    },
    {
      id: "msg-2",
      conversation_id: "conversation-1",
      sender_id: "user-2",
      body: null,
      attachment_url: "https://files.example.com/brief.pdf",
      attachment_name: "brief.pdf",
      attachment_mime_type: "application/pdf",
      attachment_size: 1024 * 1024,
      attachment_kind: "file",
      created_at: "2026-06-20T10:05:00.000Z",
      deleted_at: null,
      edited_at: null,
    },
  ]);

  assert.deepEqual(collections.images, [
    {
      id: "msg-1",
      url: "https://files.example.com/photo.jpg",
      name: "Image",
      created_at: "2026-06-20T10:00:00.000Z",
    },
  ]);
  assert.deepEqual(collections.files, [
    {
      id: "msg-2",
      url: "https://files.example.com/brief.pdf",
      name: "brief.pdf",
      kind: "file",
      created_at: "2026-06-20T10:05:00.000Z",
      subtitle: "1.0 MB",
    },
  ]);
  assert.equal(collections.links[0].url, "https://example.com/slides");
});

test("combines community chat media with shared resources", () => {
  const collections = getCommunityMediaCollections(
    [
      {
        id: "msg-1",
        community_id: "community-1",
        sender_id: "user-1",
        body: "Join https://example.com/event",
        attachment_url: null,
        attachment_name: null,
        attachment_mime_type: null,
        attachment_size: null,
        attachment_kind: null,
        created_at: "2026-06-21T10:00:00.000Z",
        deleted_at: null,
        edited_at: null,
        sender_profile: {
          id: "user-1",
          display_name: "Joel",
          avatar_url: null,
          major: "Computer Science",
          year_of_study: 2,
          badge_tier: null,
        },
      },
    ],
    [
      {
        id: "resource-1",
        owner_id: "user-1",
        community_id: "community-1",
        group_id: null,
        name: "diagram.png",
        file_url: "https://files.example.com/diagram.png",
        file_path: "community-1/diagram.png",
        mime_type: "image/png",
        size_bytes: 4096,
        created_at: "2026-06-21T10:10:00.000Z",
      },
      {
        id: "resource-2",
        owner_id: "user-1",
        community_id: "community-1",
        group_id: null,
        name: "notes.pdf",
        file_url: "https://files.example.com/notes.pdf",
        file_path: "community-1/notes.pdf",
        mime_type: "application/pdf",
        size_bytes: 2048,
        created_at: "2026-06-21T10:15:00.000Z",
      },
    ],
  );

  assert.equal(collections.links[0].url, "https://example.com/event");
  assert.equal(collections.images[0].name, "diagram.png");
  assert.deepEqual(collections.files[0], {
    id: "resource-2",
    url: "https://files.example.com/notes.pdf",
    name: "notes.pdf",
    kind: "resource",
    created_at: "2026-06-21T10:15:00.000Z",
    subtitle: "2 KB",
  });
});
