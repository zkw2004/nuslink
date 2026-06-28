-- Extend chat polls and pinned messages to support group chats.

ALTER TABLE public.chat_polls
  ADD COLUMN IF NOT EXISTS group_message_id UUID
  REFERENCES public.group_messages(id) ON DELETE CASCADE;

ALTER TABLE public.chat_pinned_messages
  ADD COLUMN IF NOT EXISTS group_message_id UUID
  REFERENCES public.group_messages(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_polls_group_message_unique
  ON public.chat_polls (group_message_id)
  WHERE group_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_pinned_messages_group_message_unique
  ON public.chat_pinned_messages (group_message_id)
  WHERE group_message_id IS NOT NULL;

ALTER TABLE public.chat_polls
  DROP CONSTRAINT IF EXISTS chat_polls_check;

ALTER TABLE public.chat_polls
  DROP CONSTRAINT IF EXISTS chat_polls_scope_check;

ALTER TABLE public.chat_pinned_messages
  DROP CONSTRAINT IF EXISTS chat_pinned_messages_check;

ALTER TABLE public.chat_pinned_messages
  DROP CONSTRAINT IF EXISTS chat_pinned_messages_scope_check;

ALTER TABLE public.chat_polls
  ADD CONSTRAINT chat_polls_scope_check CHECK (
    (
      direct_message_id IS NOT NULL
      AND community_message_id IS NULL
      AND group_message_id IS NULL
    )
    OR (
      direct_message_id IS NULL
      AND community_message_id IS NOT NULL
      AND group_message_id IS NULL
    )
    OR (
      direct_message_id IS NULL
      AND community_message_id IS NULL
      AND group_message_id IS NOT NULL
    )
  );

ALTER TABLE public.chat_pinned_messages
  ADD CONSTRAINT chat_pinned_messages_scope_check CHECK (
    (
      direct_message_id IS NOT NULL
      AND community_message_id IS NULL
      AND group_message_id IS NULL
    )
    OR (
      direct_message_id IS NULL
      AND community_message_id IS NOT NULL
      AND group_message_id IS NULL
    )
    OR (
      direct_message_id IS NULL
      AND community_message_id IS NULL
      AND group_message_id IS NOT NULL
    )
  );

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
    LEFT JOIN public.group_messages group_message
      ON group_message.id = poll.group_message_id
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
        OR (
          group_message.id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.group_members member
            WHERE member.group_id = group_message.group_id
              AND member.user_id = auth.uid()
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "chat_polls_select_members" ON public.chat_polls;
CREATE POLICY "chat_polls_select_members" ON public.chat_polls
  FOR SELECT USING (
    public.can_access_chat_poll(id)
  );

DROP POLICY IF EXISTS "chat_poll_options_select_members" ON public.chat_poll_options;
CREATE POLICY "chat_poll_options_select_members" ON public.chat_poll_options
  FOR SELECT USING (
    public.can_access_chat_poll(poll_id)
  );

DROP POLICY IF EXISTS "chat_poll_votes_select_members" ON public.chat_poll_votes;
CREATE POLICY "chat_poll_votes_select_members" ON public.chat_poll_votes
  FOR SELECT USING (
    public.can_access_chat_poll(poll_id)
  );

DROP POLICY IF EXISTS "chat_pinned_messages_select_members" ON public.chat_pinned_messages;
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
    OR (
      group_message_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.group_messages message
        JOIN public.group_members member
          ON member.group_id = message.group_id
        WHERE message.id = group_message_id
          AND member.user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_group_chat_poll(
  group_id_input UUID,
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

  IF group_id_input IS NULL THEN
    RAISE EXCEPTION 'Group is required';
  END IF;

  IF char_length(normalized_question) = 0 OR char_length(normalized_question) > 240 THEN
    RAISE EXCEPTION 'Poll question must be 1 to 240 characters';
  END IF;

  IF option_count < 2 OR option_count > 6 THEN
    RAISE EXCEPTION 'Polls need 2 to 6 options';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = group_id_input
      AND member.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  INSERT INTO public.group_messages (group_id, sender_id, body)
  VALUES (group_id_input, current_user_id, normalized_question)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_polls (group_message_id, question, created_by)
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

  UPDATE public.groups
  SET updated_at = NOW()
  WHERE id = group_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_group_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  group_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT group_id
  INTO group_id_value
  FROM public.group_messages
  WHERE id = message_id_input;

  IF group_id_value IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.group_members member
       WHERE member.group_id = group_id_value
         AND member.user_id = current_user_id
     ) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  INSERT INTO public.chat_pinned_messages (group_message_id, pinned_by)
  SELECT message_id_input, current_user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.chat_pinned_messages
    WHERE group_message_id = message_id_input
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_group_chat_message(message_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  group_id_value UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT group_id
  INTO group_id_value
  FROM public.group_messages
  WHERE id = message_id_input;

  IF group_id_value IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.group_members member
       WHERE member.group_id = group_id_value
         AND member.user_id = current_user_id
     ) THEN
    RAISE EXCEPTION 'You do not have access to this message';
  END IF;

  DELETE FROM public.chat_pinned_messages
  WHERE group_message_id = message_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_chat_poll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_chat_poll(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_group_chat_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpin_group_chat_message(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_chat_polls_group_message
  ON public.chat_polls (group_message_id)
  WHERE group_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_pinned_messages_group_created
  ON public.chat_pinned_messages (group_message_id, created_at DESC)
  WHERE group_message_id IS NOT NULL;
