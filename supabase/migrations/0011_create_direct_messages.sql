-- Milestone 2 direct messaging: only mutual connections can open and use DMs.

CREATE TABLE public.direct_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER direct_conversations_updated_at
  BEFORE UPDATE ON public.direct_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.direct_conversation_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.direct_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body             TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_direct_conversation_member(
  conversation_id_input UUID,
  user_id_input UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.direct_conversation_members member
    WHERE member.conversation_id = conversation_id_input
      AND member.user_id = user_id_input
  );
$$;

CREATE POLICY "direct_conversations_select_members" ON public.direct_conversations
  FOR SELECT USING (
    public.is_direct_conversation_member(id)
  );

CREATE POLICY "direct_conversation_members_select_own_conversations"
  ON public.direct_conversation_members
  FOR SELECT USING (
    public.is_direct_conversation_member(conversation_id)
  );

CREATE POLICY "direct_messages_select_members" ON public.direct_messages
  FOR SELECT USING (
    public.is_direct_conversation_member(conversation_id)
  );

CREATE POLICY "direct_messages_insert_sender_member" ON public.direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_direct_conversation_member(conversation_id)
  );

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  other_user_id_input UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_conversation_id UUID;
  new_conversation_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF other_user_id_input IS NULL OR other_user_id_input = current_user_id THEN
    RAISE EXCEPTION 'Choose another user to message';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connections connection
    WHERE connection.user_a_id = LEAST(current_user_id, other_user_id_input)
      AND connection.user_b_id = GREATEST(current_user_id, other_user_id_input)
  ) THEN
    RAISE EXCEPTION 'Direct messages are only available for mutual connections';
  END IF;

  SELECT member_a.conversation_id
  INTO existing_conversation_id
  FROM public.direct_conversation_members member_a
  JOIN public.direct_conversation_members member_b
    ON member_b.conversation_id = member_a.conversation_id
  WHERE member_a.user_id = current_user_id
    AND member_b.user_id = other_user_id_input
  GROUP BY member_a.conversation_id
  HAVING COUNT(*) = 2
     AND (
       SELECT COUNT(*)
       FROM public.direct_conversation_members member_count
       WHERE member_count.conversation_id = member_a.conversation_id
     ) = 2
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  INSERT INTO public.direct_conversations DEFAULT VALUES
  RETURNING id INTO new_conversation_id;

  INSERT INTO public.direct_conversation_members (conversation_id, user_id)
  VALUES
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_user_id_input);

  RETURN new_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_direct_message(
  conversation_id_input UUID,
  body_input TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF conversation_id_input IS NULL THEN
    RAISE EXCEPTION 'Conversation is required';
  END IF;

  IF body_input IS NULL OR char_length(trim(body_input)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.direct_conversation_members member
    WHERE member.conversation_id = conversation_id_input
      AND member.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  INSERT INTO public.direct_messages (conversation_id, sender_id, body)
  VALUES (conversation_id_input, current_user_id, trim(body_input))
  RETURNING id INTO created_message_id;

  UPDATE public.direct_conversations
  SET updated_at = NOW()
  WHERE id = conversation_id_input;

  RETURN created_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_direct_conversation_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message(UUID, TEXT) TO authenticated;

CREATE INDEX idx_direct_conversation_members_user
  ON public.direct_conversation_members (user_id, conversation_id);
CREATE INDEX idx_direct_messages_conversation_created_at
  ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX idx_direct_conversations_updated_at
  ON public.direct_conversations (updated_at DESC);
