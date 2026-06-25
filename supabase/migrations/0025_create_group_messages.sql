-- Milestone 2 group chat foundation for study/project group members.

CREATE TABLE IF NOT EXISTS public.group_messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body                 TEXT,
  attachment_url       TEXT,
  attachment_name      TEXT,
  attachment_mime_type TEXT,
  attachment_size      INTEGER,
  attachment_kind      TEXT CHECK (
    attachment_kind IS NULL OR attachment_kind IN ('image', 'file', 'audio', 'video')
  ),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_messages_content_check CHECK (
    (
      body IS NOT NULL
      AND char_length(trim(body)) > 0
      AND char_length(body) <= 2000
    )
    OR attachment_url IS NOT NULL
  )
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_messages_select_members"
  ON public.group_messages;

CREATE POLICY "group_messages_select_members"
  ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = group_messages.group_id
        AND member.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_messages_insert_members"
  ON public.group_messages;

CREATE POLICY "group_messages_insert_members"
  ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = group_messages.group_id
        AND member.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created_at
  ON public.group_messages (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_messages_sender_created_at
  ON public.group_messages (sender_id, created_at DESC);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
