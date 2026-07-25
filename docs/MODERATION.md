# AI Moderation Backend v1

This branch adds the backend foundation for moderating user-generated text. It
does not yet wire the React Native write paths.

## Outcomes

- `allowed`: content is safe and visible.
- `flagged`: content is borderline and should be hidden from other users when
  read filtering is wired.
- `blocked`: content is clearly unsafe and should be rejected by future write
  endpoints before persistence.
- `error`: moderation could not run, so content should remain visible and the
  event should be logged for inspection.

## Coverage

Moderation subject types cover profile bios, group names/descriptions/tags,
community names/descriptions/tags, and direct/group/community chat message text.
Attachment content scanning is out of scope for v1.

## Future Write Integration

- Profile bio saves should moderate `profiles.bio`.
- Group and community creation should moderate name, description, and tags as a
  batch.
- Chat sends should moderate the text body only.
- If any moderation result is `blocked`, reject the write with clear copy.
- If any result is `flagged`, persist the moderation outcome only when the
  corresponding read path hides flagged content.
- If moderation returns `error`, persist normally and keep the audit event.

The backend APIs are:

- `POST /v1/moderation/check`
- `POST /v1/moderation/check-batch`
