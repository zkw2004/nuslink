-- Milestone 2 community chat foundation: member-only community messages with
-- realtime delivery through Supabase Realtime.

CREATE TABLE public.community_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL CHECK (
    char_length(trim(body)) > 0
    AND char_length(body) <= 2000
  ),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_messages_select_members" ON public.community_messages
  FOR SELECT USING (
    public.is_community_member(community_id)
  );

CREATE POLICY "community_messages_insert_members" ON public.community_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_community_member(community_id)
  );

CREATE INDEX idx_community_messages_community_created_at
  ON public.community_messages (community_id, created_at DESC);

CREATE INDEX idx_community_messages_sender
  ON public.community_messages (sender_id, created_at DESC);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
