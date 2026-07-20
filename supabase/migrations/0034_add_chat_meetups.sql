-- Milestone 3 shared scheduling: meetup cards across direct, community, and group chats.

CREATE TABLE public.chat_meetups (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_message_id    UUID UNIQUE REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  community_message_id UUID UNIQUE REFERENCES public.community_messages(id) ON DELETE CASCADE,
  group_message_id     UUID UNIQUE REFERENCES public.group_messages(id) ON DELETE CASCADE,
  title                TEXT NOT NULL CHECK (
    char_length(trim(title)) > 0
    AND char_length(title) <= 120
  ),
  status               TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'closed_confirmed', 'closed_tie')
  ),
  closes_at            TIMESTAMPTZ NOT NULL,
  closed_at            TIMESTAMPTZ,
  winning_option_id    UUID,
  winning_label        TEXT,
  created_by           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_meetups_scope_check CHECK (
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
  )
);

CREATE TABLE public.chat_meetup_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id  UUID NOT NULL REFERENCES public.chat_meetups(id) ON DELETE CASCADE,
  label      TEXT NOT NULL CHECK (
    char_length(trim(label)) > 0
    AND char_length(label) <= 120
  ),
  position   INTEGER NOT NULL CHECK (position >= 0),
  source     TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('suggested', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meetup_id, position)
);

CREATE TABLE public.chat_meetup_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id  UUID NOT NULL REFERENCES public.chat_meetups(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES public.chat_meetup_options(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meetup_id, user_id)
);

ALTER TABLE public.chat_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_meetup_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_meetup_votes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_chat_meetup(meetup_id_input UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_meetups meetup
    LEFT JOIN public.direct_messages direct_message
      ON direct_message.id = meetup.direct_message_id
    LEFT JOIN public.community_messages community_message
      ON community_message.id = meetup.community_message_id
    LEFT JOIN public.group_messages group_message
      ON group_message.id = meetup.group_message_id
    WHERE meetup.id = meetup_id_input
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
              AND member.deleted_at IS NULL
          )
        )
      )
  );
$$;

CREATE POLICY "chat_meetups_select_members" ON public.chat_meetups
  FOR SELECT USING (public.can_access_chat_meetup(id));

CREATE POLICY "chat_meetup_options_select_members" ON public.chat_meetup_options
  FOR SELECT USING (public.can_access_chat_meetup(meetup_id));

CREATE POLICY "chat_meetup_votes_select_members" ON public.chat_meetup_votes
  FOR SELECT USING (public.can_access_chat_meetup(meetup_id));

CREATE OR REPLACE FUNCTION public.create_direct_chat_meetup(
  conversation_id_input UUID,
  title_input TEXT,
  option_inputs TEXT[],
  option_source_inputs TEXT[],
  closes_at_input TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  created_meetup_id UUID;
  option_text TEXT;
  option_source TEXT;
  normalized_title TEXT := trim(COALESCE(title_input, ''));
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

  IF NOT public.is_direct_conversation_member(conversation_id_input, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  IF char_length(normalized_title) = 0 OR char_length(normalized_title) > 120 THEN
    RAISE EXCEPTION 'Meetup title must be 1 to 120 characters';
  END IF;

  IF option_count < 2 OR option_count > 12 THEN
    RAISE EXCEPTION 'Meetups need 2 to 12 options';
  END IF;

  IF option_count <> COALESCE(array_length(option_source_inputs, 1), 0) THEN
    RAISE EXCEPTION 'Meetup options and sources must match';
  END IF;

  IF closes_at_input IS NULL OR closes_at_input <= NOW() THEN
    RAISE EXCEPTION 'Choose a closing time in the future';
  END IF;

  INSERT INTO public.direct_messages (conversation_id, sender_id, body)
  VALUES (conversation_id_input, current_user_id, normalized_title)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_meetups (
    direct_message_id,
    title,
    closes_at,
    created_by
  )
  VALUES (
    created_message_id,
    normalized_title,
    closes_at_input,
    current_user_id
  )
  RETURNING id INTO created_meetup_id;

  FOREACH option_text IN ARRAY option_inputs LOOP
    option_text := trim(COALESCE(option_text, ''));
    option_source := COALESCE(option_source_inputs[option_position + 1], 'custom');

    IF char_length(option_text) = 0 OR char_length(option_text) > 120 THEN
      RAISE EXCEPTION 'Meetup options must be 1 to 120 characters';
    END IF;

    IF lower(option_text) = ANY (seen_options) THEN
      RAISE EXCEPTION 'Meetup options must be unique';
    END IF;

    IF option_source NOT IN ('suggested', 'custom') THEN
      RAISE EXCEPTION 'Meetup option source is invalid';
    END IF;

    seen_options := array_append(seen_options, lower(option_text));

    INSERT INTO public.chat_meetup_options (meetup_id, label, position, source)
    VALUES (created_meetup_id, option_text, option_position, option_source);

    option_position := option_position + 1;
  END LOOP;

  UPDATE public.direct_conversations
  SET updated_at = NOW()
  WHERE id = conversation_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_community_chat_meetup(
  community_id_input UUID,
  title_input TEXT,
  option_inputs TEXT[],
  option_source_inputs TEXT[],
  closes_at_input TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  created_meetup_id UUID;
  option_text TEXT;
  option_source TEXT;
  normalized_title TEXT := trim(COALESCE(title_input, ''));
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

  IF NOT public.is_community_member(community_id_input, current_user_id) THEN
    RAISE EXCEPTION 'You do not have access to this community';
  END IF;

  IF char_length(normalized_title) = 0 OR char_length(normalized_title) > 120 THEN
    RAISE EXCEPTION 'Meetup title must be 1 to 120 characters';
  END IF;

  IF option_count < 2 OR option_count > 12 THEN
    RAISE EXCEPTION 'Meetups need 2 to 12 options';
  END IF;

  IF option_count <> COALESCE(array_length(option_source_inputs, 1), 0) THEN
    RAISE EXCEPTION 'Meetup options and sources must match';
  END IF;

  IF closes_at_input IS NULL OR closes_at_input <= NOW() THEN
    RAISE EXCEPTION 'Choose a closing time in the future';
  END IF;

  INSERT INTO public.community_messages (community_id, sender_id, body)
  VALUES (community_id_input, current_user_id, normalized_title)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_meetups (
    community_message_id,
    title,
    closes_at,
    created_by
  )
  VALUES (
    created_message_id,
    normalized_title,
    closes_at_input,
    current_user_id
  )
  RETURNING id INTO created_meetup_id;

  FOREACH option_text IN ARRAY option_inputs LOOP
    option_text := trim(COALESCE(option_text, ''));
    option_source := COALESCE(option_source_inputs[option_position + 1], 'custom');

    IF char_length(option_text) = 0 OR char_length(option_text) > 120 THEN
      RAISE EXCEPTION 'Meetup options must be 1 to 120 characters';
    END IF;

    IF lower(option_text) = ANY (seen_options) THEN
      RAISE EXCEPTION 'Meetup options must be unique';
    END IF;

    IF option_source NOT IN ('suggested', 'custom') THEN
      RAISE EXCEPTION 'Meetup option source is invalid';
    END IF;

    seen_options := array_append(seen_options, lower(option_text));

    INSERT INTO public.chat_meetup_options (meetup_id, label, position, source)
    VALUES (created_meetup_id, option_text, option_position, option_source);

    option_position := option_position + 1;
  END LOOP;

  UPDATE public.communities
  SET updated_at = NOW()
  WHERE id = community_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_chat_meetup(
  group_id_input UUID,
  title_input TEXT,
  option_inputs TEXT[],
  option_source_inputs TEXT[],
  closes_at_input TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  created_meetup_id UUID;
  option_text TEXT;
  option_source TEXT;
  normalized_title TEXT := trim(COALESCE(title_input, ''));
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = group_id_input
      AND member.user_id = current_user_id
      AND member.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  IF char_length(normalized_title) = 0 OR char_length(normalized_title) > 120 THEN
    RAISE EXCEPTION 'Meetup title must be 1 to 120 characters';
  END IF;

  IF option_count < 2 OR option_count > 12 THEN
    RAISE EXCEPTION 'Meetups need 2 to 12 options';
  END IF;

  IF option_count <> COALESCE(array_length(option_source_inputs, 1), 0) THEN
    RAISE EXCEPTION 'Meetup options and sources must match';
  END IF;

  IF closes_at_input IS NULL OR closes_at_input <= NOW() THEN
    RAISE EXCEPTION 'Choose a closing time in the future';
  END IF;

  INSERT INTO public.group_messages (group_id, sender_id, body)
  VALUES (group_id_input, current_user_id, normalized_title)
  RETURNING id INTO created_message_id;

  INSERT INTO public.chat_meetups (
    group_message_id,
    title,
    closes_at,
    created_by
  )
  VALUES (
    created_message_id,
    normalized_title,
    closes_at_input,
    current_user_id
  )
  RETURNING id INTO created_meetup_id;

  FOREACH option_text IN ARRAY option_inputs LOOP
    option_text := trim(COALESCE(option_text, ''));
    option_source := COALESCE(option_source_inputs[option_position + 1], 'custom');

    IF char_length(option_text) = 0 OR char_length(option_text) > 120 THEN
      RAISE EXCEPTION 'Meetup options must be 1 to 120 characters';
    END IF;

    IF lower(option_text) = ANY (seen_options) THEN
      RAISE EXCEPTION 'Meetup options must be unique';
    END IF;

    IF option_source NOT IN ('suggested', 'custom') THEN
      RAISE EXCEPTION 'Meetup option source is invalid';
    END IF;

    seen_options := array_append(seen_options, lower(option_text));

    INSERT INTO public.chat_meetup_options (meetup_id, label, position, source)
    VALUES (created_meetup_id, option_text, option_position, option_source);

    option_position := option_position + 1;
  END LOOP;

  UPDATE public.groups
  SET updated_at = NOW()
  WHERE id = group_id_input;

  RETURN created_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.vote_chat_meetup(
  meetup_id_input UUID,
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

  IF meetup_id_input IS NULL OR option_id_input IS NULL THEN
    RAISE EXCEPTION 'Choose a meetup option';
  END IF;

  PERFORM public.close_due_chat_meetups();

  IF NOT public.can_access_chat_meetup(meetup_id_input) THEN
    RAISE EXCEPTION 'You do not have access to this meetup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chat_meetups meetup
    WHERE meetup.id = meetup_id_input
      AND meetup.status <> 'open'
  ) THEN
    RAISE EXCEPTION 'Voting for this meetup is already closed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_meetup_options option
    WHERE option.id = option_id_input
      AND option.meetup_id = meetup_id_input
  ) THEN
    RAISE EXCEPTION 'Choose a valid meetup option';
  END IF;

  INSERT INTO public.chat_meetup_votes (meetup_id, option_id, user_id)
  VALUES (meetup_id_input, option_id_input, current_user_id)
  ON CONFLICT (meetup_id, user_id)
  DO UPDATE SET
    option_id = EXCLUDED.option_id,
    created_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.unvote_chat_meetup(
  meetup_id_input UUID
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

  PERFORM public.close_due_chat_meetups();

  IF NOT public.can_access_chat_meetup(meetup_id_input) THEN
    RAISE EXCEPTION 'You do not have access to this meetup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chat_meetups meetup
    WHERE meetup.id = meetup_id_input
      AND meetup.status <> 'open'
  ) THEN
    RAISE EXCEPTION 'Voting for this meetup is already closed';
  END IF;

  DELETE FROM public.chat_meetup_votes
  WHERE meetup_id = meetup_id_input
    AND user_id = current_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_due_chat_meetups()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meetup_row RECORD;
  top_vote_count INTEGER;
  top_option_count INTEGER;
  winner_option_id UUID;
  winner_label TEXT;
BEGIN
  FOR meetup_row IN
    SELECT meetup.id
    FROM public.chat_meetups meetup
    WHERE meetup.status = 'open'
      AND meetup.closes_at <= NOW()
  LOOP
    SELECT option_id, vote_count, label
    INTO winner_option_id, top_vote_count, winner_label
    FROM (
      SELECT
        option.id AS option_id,
        option.label,
        COUNT(vote.id) AS vote_count
      FROM public.chat_meetup_options option
      LEFT JOIN public.chat_meetup_votes vote
        ON vote.option_id = option.id
      WHERE option.meetup_id = meetup_row.id
      GROUP BY option.id, option.label
      ORDER BY COUNT(vote.id) DESC, option.position ASC
      LIMIT 1
    ) ranked_options;

    IF winner_option_id IS NULL THEN
      UPDATE public.chat_meetups
      SET
        status = 'closed_tie',
        closed_at = NOW(),
        winning_option_id = NULL,
        winning_label = NULL
      WHERE id = meetup_row.id;
      CONTINUE;
    END IF;

    SELECT COUNT(*)
    INTO top_option_count
    FROM (
      SELECT COUNT(vote.id) AS vote_count
      FROM public.chat_meetup_options option
      LEFT JOIN public.chat_meetup_votes vote
        ON vote.option_id = option.id
      WHERE option.meetup_id = meetup_row.id
      GROUP BY option.id
      HAVING COUNT(vote.id) = COALESCE(top_vote_count, 0)
    ) tied_options;

    IF COALESCE(top_option_count, 0) > 1 THEN
      UPDATE public.chat_meetups
      SET
        status = 'closed_tie',
        closed_at = NOW(),
        winning_option_id = NULL,
        winning_label = NULL
      WHERE id = meetup_row.id;
    ELSE
      UPDATE public.chat_meetups
      SET
        status = 'closed_confirmed',
        closed_at = NOW(),
        winning_option_id = winner_option_id,
        winning_label = winner_label
      WHERE id = meetup_row.id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_chat_meetup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chat_meetup(UUID, TEXT, TEXT[], TEXT[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_chat_meetup(UUID, TEXT, TEXT[], TEXT[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_chat_meetup(UUID, TEXT, TEXT[], TEXT[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_chat_meetup(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unvote_chat_meetup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_due_chat_meetups() TO authenticated;
