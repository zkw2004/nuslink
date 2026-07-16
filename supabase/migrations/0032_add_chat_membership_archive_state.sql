ALTER TABLE public.direct_conversation_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_direct_conversation_members_inbox_state
  ON public.direct_conversation_members (user_id, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_group_members_inbox_state
  ON public.group_members (user_id, archived_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_community_members_inbox_state
  ON public.community_members (user_id, archived_at, deleted_at);
