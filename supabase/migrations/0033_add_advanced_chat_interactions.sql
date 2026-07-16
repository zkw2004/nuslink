ALTER TABLE public.direct_conversation_members
  ADD COLUMN IF NOT EXISTS muted_at TIMESTAMPTZ;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS muted_at TIMESTAMPTZ;

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS muted_at TIMESTAMPTZ;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.chat_message_user_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direct_message_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  group_message_id UUID REFERENCES public.group_messages(id) ON DELETE CASCADE,
  community_message_id UUID REFERENCES public.community_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_message_user_deletions_one_message_check CHECK (
    (
      CASE WHEN direct_message_id IS NULL THEN 0 ELSE 1 END
      + CASE WHEN group_message_id IS NULL THEN 0 ELSE 1 END
      + CASE WHEN community_message_id IS NULL THEN 0 ELSE 1 END
    ) = 1
  )
);

ALTER TABLE public.chat_message_user_deletions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_user_deletions_direct
  ON public.chat_message_user_deletions (user_id, direct_message_id)
  WHERE direct_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_user_deletions_group
  ON public.chat_message_user_deletions (user_id, group_message_id)
  WHERE group_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_user_deletions_community
  ON public.chat_message_user_deletions (user_id, community_message_id)
  WHERE community_message_id IS NOT NULL;

DROP POLICY IF EXISTS "chat_message_user_deletions_select_own"
  ON public.chat_message_user_deletions;
CREATE POLICY "chat_message_user_deletions_select_own"
  ON public.chat_message_user_deletions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_message_user_deletions_insert_own"
  ON public.chat_message_user_deletions;
CREATE POLICY "chat_message_user_deletions_insert_own"
  ON public.chat_message_user_deletions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "direct_messages_update_sender"
  ON public.direct_messages;
CREATE POLICY "direct_messages_update_sender"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "group_messages_update_sender"
  ON public.group_messages;
CREATE POLICY "group_messages_update_sender"
  ON public.group_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "community_messages_update_sender"
  ON public.community_messages;
CREATE POLICY "community_messages_update_sender"
  ON public.community_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_direct_conversation_members_muted
  ON public.direct_conversation_members (user_id, muted_at);

CREATE INDEX IF NOT EXISTS idx_group_members_muted
  ON public.group_members (user_id, muted_at);

CREATE INDEX IF NOT EXISTS idx_community_members_muted
  ON public.community_members (user_id, muted_at);

CREATE INDEX IF NOT EXISTS idx_direct_messages_deleted
  ON public.direct_messages (conversation_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_messages_deleted
  ON public.group_messages (group_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_messages_deleted
  ON public.community_messages (community_id, deleted_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.delete_direct_conversation_for_all(
  conversation_id_input UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.direct_conversation_members member
    WHERE member.conversation_id = conversation_id_input
      AND member.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  UPDATE public.direct_conversation_members
  SET archived_at = NULL,
      deleted_at = now()
  WHERE conversation_id = conversation_id_input;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_direct_conversation_for_all(UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_direct_conversation_for_all(UUID)
  TO authenticated;
