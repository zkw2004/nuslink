-- Ensure chat read-state columns exist in projects that missed the earlier
-- read-state migration because of duplicate 0024 migration numbering.

ALTER TABLE public.direct_conversation_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_direct_conversation_members_read_state
  ON public.direct_conversation_members (user_id, conversation_id, last_read_at);

CREATE INDEX IF NOT EXISTS idx_group_members_read_state
  ON public.group_members (user_id, group_id, last_read_at);

CREATE INDEX IF NOT EXISTS idx_community_members_read_state
  ON public.community_members (user_id, community_id, last_read_at);
