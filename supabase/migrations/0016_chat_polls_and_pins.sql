-- Milestone 2 chat features: inline polls and pinned messages.

CREATE TABLE public.chat_polls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_message_id    UUID UNIQUE REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  community_message_id UUID UNIQUE REFERENCES public.community_messages(id) ON DELETE CASCADE,
  question             TEXT NOT NULL CHECK (
    char_length(trim(question)) > 0
    AND char_length(question) <= 240
  ),
  created_by           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (direct_message_id IS NOT NULL AND community_message_id IS NULL)
    OR (direct_message_id IS NULL AND community_message_id IS NOT NULL)
  )
);

CREATE TABLE public.chat_poll_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (
    char_length(trim(body)) > 0
    AND char_length(body) <= 80
  ),
  position   INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, position)
);

CREATE TABLE public.chat_poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES public.chat_poll_options(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE public.chat_pinned_messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_message_id    UUID UNIQUE REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  community_message_id UUID UNIQUE REFERENCES public.community_messages(id) ON DELETE CASCADE,
  pinned_by            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (direct_message_id IS NOT NULL AND community_message_id IS NULL)
    OR (direct_message_id IS NULL AND community_message_id IS NOT NULL)
  )
);

ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_chat_poll(poll_id_input UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_polls poll
    LEFT JOIN public.direct_messages direct_message
      ON direct_message.id = poll.direct_message_id
    LEFT JOIN public.community_messages community_message
      ON community_message.id = poll.community_message_id
    WHERE poll.id = poll_id_input
      AND (
        (
          direct_message.id IS NOT NULL
          AND public.is_direct_conversation_member(direct_message.conversation_id)
        )
        OR (
          community_message.id IS NOT NULL
          AND public.is_community_member(community_message.community_id)
        )
      )
  );
$$;

CREATE POLICY "chat_polls_select_members" ON public.chat_polls
  FOR SELECT USING (
    public.can_access_chat_poll(id)
  );

CREATE POLICY "chat_poll_options_select_members" ON public.chat_poll_options
  FOR SELECT USING (
    public.can_access_chat_poll(poll_id)
  );

CREATE POLICY "chat_poll_votes_select_members" ON public.chat_poll_votes
  FOR SELECT USING (
    public.can_access_chat_poll(poll_id)
  );

CREATE POLICY "chat_pinned_messages_select_members" ON public.chat_pinned_messages
  FOR SELECT USING (
    (
      direct_message_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.direct_messages message
        WHERE message.id = direct_message_id
          AND public.is_direct_conversation_member(message.conversation_id)
      )
    )
    OR (
      community_message_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.community_messages message
        WHERE message.id = community_message_id
          AND public.is_community_member(message.community_id)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_direct_chat_poll(
  conversation_id_input UUID,
  question_input TEXT,
  option_inputs TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  created_poll_id UUID;
  option_text TEXT;
  normalized_question TEXT := trim(COALESCE(question_input, ''));
  option_count INTEGER := COALESCE(array_length(option_inputs, 1), 0);
  option_position INTEGER := 0;
  seen_options TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF conversation_id_input IS NULL THEN
    RAISE EXCEPTION 'Conversation is required';
  END IF;

  IF char_length(normalized_question) = 0 OR char_length(normalized_question) > 240 THEN
    RAISE EXCEPTION 'Poll question must be 1 to 240 characters';
  END IF;

  IF option_count < 2 OR option_count > 6 THEN
    RAISE EXCEPTION 'Polls need 2 to 6 options';
  END IF;

  IF NOT public.is_direct_conversation_member(conversation_id_input, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  INSERT INTO public.direct_messages (conversation_id, sender_id, body)
  VALUES (conversation_id_input, current_user_id, normalized_question)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_polls (direct_message_id, question, created_by)
  VALUES (created_message_id, normalized_question, current_user_id)
  RETURNING id INTO created_poll_id;

  FOREACH option_text IN ARRAY option_inputs LOOP
    option_text := trim(COALESCE(option_text, ''));

    IF char_length(option_text) = 0 OR char_length(option_text) > 80 THEN
      RAISE EXCEPTION 'Poll options must be 1 to 80 characters';
    END IF;

    IF lower(option_text) = ANY (seen_options) THEN
      RAISE EXCEPTION 'Poll options must be unique';
    END IF;

    seen_options := array_append(seen_options, lower(option_text));

    INSERT INTO public.chat_poll_options (poll_id, body, position)
    VALUES (created_poll_id, option_text, option_position);

    option_position := option_position + 1;
  END LOOP;

  UPDATE public.direct_conversations
  SET updated_at = NOW()
  WHERE id = conversation_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_community_chat_poll(
  community_id_input UUID,
  question_input TEXT,
  option_inputs TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  created_poll_id UUID;
  option_text TEXT;
  normalized_question TEXT := trim(COALESCE(question_input, ''));
  option_count INTEGER := COALESCE(array_length(option_inputs, 1), 0);
  option_position INTEGER := 0;
  seen_options TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF community_id_input IS NULL THEN
    RAISE EXCEPTION 'Community is required';
  END IF;

  IF char_length(normalized_question) = 0 OR char_length(normalized_question) > 240 THEN
    RAISE EXCEPTION 'Poll question must be 1 to 240 characters';
  END IF;

  IF option_count < 2 OR option_count > 6 THEN
    RAISE EXCEPTION 'Polls need 2 to 6 options';
  END IF;

  IF NOT public.is_community_member(community_id_input, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this community';
  END IF;

  INSERT INTO public.community_messages (community_id, sender_id, body)
  VALUES (community_id_input, current_user_id, normalized_question)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_polls (community_message_id, question, created_by)
  VALUES (created_message_id, normalized_question, current_user_id)
  RETURNING id INTO created_poll_id;

  FOREACH option_text IN ARRAY option_inputs LOOP
    option_text := trim(COALESCE(option_text, ''));

    IF char_length(option_text) = 0 OR char_length(option_text) > 80 THEN
      RAISE EXCEPTION 'Poll options must be 1 to 80 characters';
    END IF;

    IF lower(option_text) = ANY (seen_options) THEN
      RAISE EXCEPTION 'Poll options must be unique';
    END IF;

    seen_options := array_append(seen_options, lower(option_text));

    INSERT INTO public.chat_poll_options (poll_id, body, position)
    VALUES (created_poll_id, option_text, option_position);

    option_position := option_position + 1;
  END LOOP;

  UPDATE public.communities
  SET updated_at = NOW()
  WHERE id = community_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vote_chat_poll(
  poll_id_input UUID,
  option_id_input UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF poll_id_input IS NULL OR option_id_input IS NULL THEN
    RAISE EXCEPTION 'Choose a poll option';
  END IF;

  IF NOT public.can_access_chat_poll(poll_id_input) THEN
    RAISE EXCEPTION 'You do not have access to this poll';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_poll_options option
    WHERE option.id = option_id_input
      AND option.poll_id = poll_id_input
  ) THEN
    RAISE EXCEPTION 'Choose a valid poll option';
  END IF;

  INSERT INTO public.chat_poll_votes (poll_id, option_id, user_id)
  VALUES (poll_id_input, option_id_input, current_user_id)
  ON CONFLICT (poll_id, user_id)
  DO UPDATE SET
    option_id = EXCLUDED.option_id,
    created_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_direct_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conversation_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT conversation_id
  INTO conversation_id_value
  FROM public.direct_messages
  WHERE id = message_id_input;

  IF conversation_id_value IS NULL
     OR NOT public.is_direct_conversation_member(conversation_id_value, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  INSERT INTO public.chat_pinned_messages (direct_message_id, pinned_by)
  VALUES (message_id_input, current_user_id)
  ON CONFLICT (direct_message_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_direct_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conversation_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT conversation_id
  INTO conversation_id_value
  FROM public.direct_messages
  WHERE id = message_id_input;

  IF conversation_id_value IS NULL
     OR NOT public.is_direct_conversation_member(conversation_id_value, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  DELETE FROM public.chat_pinned_messages
  WHERE direct_message_id = message_id_input;
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_community_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  community_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT community_id
  INTO community_id_value
  FROM public.community_messages
  WHERE id = message_id_input;

  IF community_id_value IS NULL
     OR NOT public.is_community_member(community_id_value, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  INSERT INTO public.chat_pinned_messages (community_message_id, pinned_by)
  VALUES (message_id_input, current_user_id)
  ON CONFLICT (community_message_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_community_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  community_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT community_id
  INTO community_id_value
  FROM public.community_messages
  WHERE id = message_id_input;

  IF community_id_value IS NULL
     OR NOT public.is_community_member(community_id_value, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  DELETE FROM public.chat_pinned_messages
  WHERE community_message_id = message_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_chat_poll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chat_poll(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_chat_poll(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_chat_poll(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_direct_chat_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpin_direct_chat_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_community_chat_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpin_community_chat_message(UUID) TO authenticated;

CREATE INDEX idx_chat_polls_direct_message ON public.chat_polls (direct_message_id)
  WHERE direct_message_id IS NOT NULL;
CREATE INDEX idx_chat_polls_community_message ON public.chat_polls (community_message_id)
  WHERE community_message_id IS NOT NULL;
CREATE INDEX idx_chat_poll_options_poll_position
  ON public.chat_poll_options (poll_id, position);
CREATE INDEX idx_chat_poll_votes_poll
  ON public.chat_poll_votes (poll_id, option_id);
CREATE INDEX idx_chat_pinned_messages_direct_created
  ON public.chat_pinned_messages (direct_message_id, created_at DESC)
  WHERE direct_message_id IS NOT NULL;
CREATE INDEX idx_chat_pinned_messages_community_created
  ON public.chat_pinned_messages (community_message_id, created_at DESC)
  WHERE community_message_id IS NOT NULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_polls;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_options;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_votes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_pinned_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
