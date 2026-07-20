ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS review_min_membership_days SMALLINT NOT NULL DEFAULT 7
  CHECK (review_min_membership_days >= 0);

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_group_members_active_user
  ON public.group_members (user_id, group_id)
  WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.badge_tier_rules (
  tier badge_tier PRIMARY KEY,
  min_review_count INTEGER NOT NULL CHECK (min_review_count >= 0),
  min_average_score NUMERIC(4,2) NOT NULL CHECK (
    min_average_score >= 1
    AND min_average_score <= 5
  ),
  priority SMALLINT NOT NULL UNIQUE CHECK (priority >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reliability_score SMALLINT NOT NULL CHECK (
    reliability_score >= 1
    AND reliability_score <= 5
  ),
  communication_score SMALLINT NOT NULL CHECK (
    communication_score >= 1
    AND communication_score <= 5
  ),
  contribution_score SMALLINT NOT NULL CHECK (
    contribution_score >= 1
    AND contribution_score <= 5
  ),
  written_review TEXT CHECK (
    written_review IS NULL
    OR char_length(trim(written_review)) <= 500
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_reviews_reviewer_reviewee_check CHECK (reviewer_id <> reviewee_id),
  CONSTRAINT group_reviews_unique_review UNIQUE (group_id, reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_group_reviews_reviewee
  ON public.group_reviews (reviewee_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_reviews_reviewer
  ON public.group_reviews (reviewer_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_reviews_group
  ON public.group_reviews (group_id, updated_at DESC);

DROP TRIGGER IF EXISTS badge_tier_rules_updated_at
  ON public.badge_tier_rules;
CREATE TRIGGER badge_tier_rules_updated_at
  BEFORE UPDATE ON public.badge_tier_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS group_reviews_updated_at
  ON public.group_reviews;
CREATE TRIGGER group_reviews_updated_at
  BEFORE UPDATE ON public.group_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.badge_tier_rules (tier, min_review_count, min_average_score, priority)
VALUES
  ('bronze', 3, 3.50, 1),
  ('silver', 8, 4.00, 2),
  ('gold', 15, 4.50, 3)
ON CONFLICT (tier) DO UPDATE
SET
  min_review_count = EXCLUDED.min_review_count,
  min_average_score = EXCLUDED.min_average_score,
  priority = EXCLUDED.priority,
  updated_at = NOW();

ALTER TABLE public.badge_tier_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badge_tier_rules_select_authenticated"
  ON public.badge_tier_rules;
CREATE POLICY "badge_tier_rules_select_authenticated"
  ON public.badge_tier_rules
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "group_reviews_select_related_users"
  ON public.group_reviews;
CREATE POLICY "group_reviews_select_related_users"
  ON public.group_reviews
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = reviewer_id
      OR auth.uid() = reviewee_id
    )
  );

CREATE OR REPLACE FUNCTION public.upsert_group_membership(
  group_id_input UUID,
  user_id_input UUID,
  role_input user_role DEFAULT 'member'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (
    group_id,
    user_id,
    role,
    joined_at,
    left_at,
    archived_at,
    deleted_at,
    last_read_at,
    muted_at
  )
  VALUES (
    group_id_input,
    user_id_input,
    role_input,
    NOW(),
    NULL,
    NULL,
    NULL,
    NOW(),
    NULL
  )
  ON CONFLICT (group_id, user_id) DO UPDATE
  SET
    joined_at = NOW(),
    left_at = NULL,
    archived_at = NULL,
    deleted_at = NULL,
    last_read_at = NOW(),
    muted_at = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_join_group(
  group_id_input UUID,
  user_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  viewer_profile public.profiles%ROWTYPE;
  creator_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF target_group.creator_id = user_id_input THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_id_input
      AND user_id = user_id_input
      AND left_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  IF target_group.privacy = 'public' THEN
    RETURN TRUE;
  END IF;

  IF target_group.privacy = 'private' THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO viewer_profile
  FROM public.profiles
  WHERE id = user_id_input;

  SELECT * INTO creator_profile
  FROM public.profiles
  WHERE id = target_group.creator_id;

  IF target_group.restriction = 'same_module' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_modules viewer_mod
      JOIN public.user_modules creator_mod
        ON creator_mod.module_code = viewer_mod.module_code
       AND creator_mod.semester = viewer_mod.semester
      WHERE viewer_mod.user_id = user_id_input
        AND creator_mod.user_id = target_group.creator_id
        AND viewer_mod.semester = target_group.semester
    );
  ELSIF target_group.restriction = 'same_year' THEN
    RETURN viewer_profile.year_of_study IS NOT NULL
      AND creator_profile.year_of_study IS NOT NULL
      AND viewer_profile.year_of_study = creator_profile.year_of_study;
  ELSIF target_group.restriction = 'same_faculty' THEN
    RETURN viewer_profile.faculty IS NOT NULL
      AND creator_profile.faculty IS NOT NULL
      AND lower(viewer_profile.faculty) = lower(creator_profile.faculty);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_visible_group(group_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF target_group.privacy = 'private' THEN
    RAISE EXCEPTION 'Private groups require an invite code';
  END IF;

  IF NOT public.user_can_join_group(group_id_input, auth.uid()) THEN
    RAISE EXCEPTION 'You do not meet this group restriction';
  END IF;

  PERFORM public.upsert_group_membership(group_id_input, auth.uid(), 'member');
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_visible_group(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_group_with_invite(invite_code_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target_group_id
  FROM public.groups
  WHERE invite_code = upper(trim(invite_code_input))
    AND privacy = 'private'
    AND is_active = TRUE;

  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found';
  END IF;

  PERFORM public.upsert_group_membership(target_group_id, auth.uid(), 'member');

  RETURN target_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_with_invite(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_group(group_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_group public.groups%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF target_group.creator_id = current_user_id THEN
    RAISE EXCEPTION 'Group creators must delete the group instead of leaving it';
  END IF;

  UPDATE public.group_members
  SET
    left_at = NOW(),
    archived_at = NULL,
    deleted_at = NULL
  WHERE group_id = group_id_input
    AND user_id = current_user_id
    AND left_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an active member of this group';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_discover_groups(semester_input TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type group_type,
  module_code TEXT,
  description TEXT,
  creator_id UUID,
  privacy privacy_setting,
  restriction semi_private_restriction,
  semester TEXT,
  joined BOOLEAN,
  can_join BOOLEAN,
  request_pending BOOLEAN,
  join_note TEXT,
  invite_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.type,
    g.module_code,
    CASE
      WHEN g.privacy = 'private'
        AND g.creator_id <> auth.uid()
        AND NOT EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id
            AND gm.user_id = auth.uid()
            AND gm.left_at IS NULL
        )
        THEN NULL
      ELSE g.description
    END AS description,
    g.creator_id,
    g.privacy,
    g.restriction,
    g.semester,
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = g.id
        AND gm.user_id = auth.uid()
        AND gm.left_at IS NULL
    ) AS joined,
    (
      NOT EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
          AND gm.left_at IS NULL
      )
      AND g.privacy <> 'private'
      AND public.user_can_join_group(g.id, auth.uid())
    ) AS can_join,
    EXISTS (
      SELECT 1 FROM public.group_join_requests request
      WHERE request.group_id = g.id
        AND request.requester_id = auth.uid()
        AND request.status = 'pending'
    ) AS request_pending,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
          AND gm.left_at IS NULL
      ) THEN 'Already joined'
      WHEN g.creator_id = auth.uid() THEN 'You created this group'
      WHEN EXISTS (
        SELECT 1 FROM public.group_join_requests request
        WHERE request.group_id = g.id
          AND request.requester_id = auth.uid()
          AND request.status = 'pending'
      ) THEN 'Join request pending'
      WHEN g.privacy = 'public' THEN 'Open to all app users'
      WHEN g.privacy = 'private' THEN 'Request access from the group owner'
      WHEN public.user_can_join_group(g.id, auth.uid()) THEN 'You meet this group restriction'
      ELSE 'Restricted to eligible students'
    END AS join_note,
    NULL::TEXT AS invite_code
  FROM public.groups g
  WHERE g.is_active = TRUE
    AND g.semester = semester_input
  ORDER BY g.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_groups(TEXT) TO authenticated;

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
        AND member.left_at IS NULL
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
        AND member.left_at IS NULL
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
              AND member.left_at IS NULL
          )
        )
      )
  );
$$;

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
          AND member.left_at IS NULL
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
      AND member.left_at IS NULL
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
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_messages message
    JOIN public.group_members member
      ON member.group_id = message.group_id
    WHERE message.id = message_id_input
      AND member.user_id = current_user_id
      AND member.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  INSERT INTO public.chat_pinned_messages (group_message_id, pinned_by)
  VALUES (message_id_input, current_user_id)
  ON CONFLICT (group_message_id) WHERE group_message_id IS NOT NULL
  DO UPDATE SET pinned_by = EXCLUDED.pinned_by, created_at = NOW();
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
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_messages message
    JOIN public.group_members member
      ON member.group_id = message.group_id
    WHERE message.id = message_id_input
      AND member.user_id = current_user_id
      AND member.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  DELETE FROM public.chat_pinned_messages
  WHERE group_message_id = message_id_input;
END;
$$;

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
              AND member.left_at IS NULL
          )
        )
      )
  );
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
      AND member.left_at IS NULL
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

CREATE OR REPLACE FUNCTION public.is_group_review_eligible(
  group_id_input UUID,
  reviewer_id_input UUID,
  reviewee_id_input UUID,
  at_time_input TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  is_eligible BOOLEAN,
  reason TEXT,
  required_days SMALLINT,
  reviewer_joined_at TIMESTAMPTZ,
  reviewee_joined_at TIMESTAMPTZ,
  eligible_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  reviewer_membership public.group_members%ROWTYPE;
  reviewee_membership public.group_members%ROWTYPE;
  shared_start TIMESTAMPTZ;
  shared_end TIMESTAMPTZ;
  threshold_at TIMESTAMPTZ;
BEGIN
  IF reviewer_id_input IS NULL OR reviewee_id_input IS NULL OR group_id_input IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Missing required ids', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF reviewer_id_input = reviewee_id_input THEN
    RETURN QUERY SELECT FALSE, 'You cannot review yourself', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Group not found', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO reviewer_membership
  FROM public.group_members
  WHERE group_id = group_id_input
    AND user_id = reviewer_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reviewer has no membership in this group', target_group.review_min_membership_days, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO reviewee_membership
  FROM public.group_members
  WHERE group_id = group_id_input
    AND user_id = reviewee_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reviewee has no membership in this group', target_group.review_min_membership_days, reviewer_membership.joined_at, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  shared_start := GREATEST(reviewer_membership.joined_at, reviewee_membership.joined_at);
  shared_end := LEAST(
    COALESCE(reviewer_membership.left_at, at_time_input),
    COALESCE(reviewee_membership.left_at, at_time_input),
    at_time_input
  );
  threshold_at := shared_start + make_interval(days => target_group.review_min_membership_days);

  IF shared_end >= threshold_at THEN
    RETURN QUERY
      SELECT
        TRUE,
        'Eligible to review',
        target_group.review_min_membership_days,
        reviewer_membership.joined_at,
        reviewee_membership.joined_at,
        threshold_at;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      FALSE,
      'Not enough shared membership time yet',
      target_group.review_min_membership_days,
      reviewer_membership.joined_at,
      reviewee_membership.joined_at,
      threshold_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_profile_badge_tier(
  profile_id_input UUID
)
RETURNS badge_tier
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_count INTEGER := 0;
  average_score NUMERIC(4,2);
  selected_tier badge_tier;
BEGIN
  SELECT
    COUNT(*),
    ROUND(AVG((reliability_score + communication_score + contribution_score)::NUMERIC / 3), 2)
  INTO review_count, average_score
  FROM public.group_reviews
  WHERE reviewee_id = profile_id_input;

  SELECT rule.tier
  INTO selected_tier
  FROM public.badge_tier_rules rule
  WHERE review_count >= rule.min_review_count
    AND COALESCE(average_score, 0) >= rule.min_average_score
  ORDER BY rule.priority DESC
  LIMIT 1;

  UPDATE public.profiles
  SET badge_tier = selected_tier
  WHERE id = profile_id_input;

  RETURN selected_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_group_review(
  group_id_input UUID,
  reviewee_id_input UUID,
  reliability_input SMALLINT,
  communication_input SMALLINT,
  contribution_input SMALLINT,
  written_review_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_review_id UUID;
  created_or_updated_review_id UUID;
  eligibility RECORD;
  normalized_written_review TEXT := NULLIF(trim(COALESCE(written_review_input, '')), '');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF reliability_input NOT BETWEEN 1 AND 5
    OR communication_input NOT BETWEEN 1 AND 5
    OR contribution_input NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Review scores must be between 1 and 5';
  END IF;

  IF normalized_written_review IS NOT NULL
    AND char_length(normalized_written_review) > 500 THEN
    RAISE EXCEPTION 'Written review must be 500 characters or fewer';
  END IF;

  SELECT * INTO eligibility
  FROM public.is_group_review_eligible(
    group_id_input,
    current_user_id,
    reviewee_id_input,
    NOW()
  );

  IF NOT COALESCE(eligibility.is_eligible, FALSE) THEN
    RAISE EXCEPTION '%', COALESCE(eligibility.reason, 'Review is not allowed');
  END IF;

  SELECT id INTO existing_review_id
  FROM public.group_reviews
  WHERE group_id = group_id_input
    AND reviewer_id = current_user_id
    AND reviewee_id = reviewee_id_input;

  IF existing_review_id IS NULL THEN
    INSERT INTO public.group_reviews (
      group_id,
      reviewer_id,
      reviewee_id,
      reliability_score,
      communication_score,
      contribution_score,
      written_review
    )
    VALUES (
      group_id_input,
      current_user_id,
      reviewee_id_input,
      reliability_input,
      communication_input,
      contribution_input,
      normalized_written_review
    )
    RETURNING id INTO created_or_updated_review_id;
  ELSE
    UPDATE public.group_reviews
    SET
      reliability_score = reliability_input,
      communication_score = communication_input,
      contribution_score = contribution_input,
      written_review = normalized_written_review
    WHERE id = existing_review_id
    RETURNING id INTO created_or_updated_review_id;
  END IF;

  PERFORM public.recalculate_profile_badge_tier(reviewee_id_input);

  RETURN created_or_updated_review_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_review_eligibility(
  group_id_input UUID,
  reviewee_id_input UUID
)
RETURNS TABLE(
  is_eligible BOOLEAN,
  reason TEXT,
  required_days SMALLINT,
  reviewer_joined_at TIMESTAMPTZ,
  reviewee_joined_at TIMESTAMPTZ,
  eligible_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.is_group_review_eligible(
    group_id_input,
    auth.uid(),
    reviewee_id_input,
    NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.list_profile_reviews(
  profile_id_input UUID,
  limit_input INTEGER DEFAULT 20,
  offset_input INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  group_id UUID,
  reviewer_id UUID,
  reviewee_id UUID,
  reviewer_display_name TEXT,
  reviewer_avatar_url TEXT,
  group_name TEXT,
  group_type group_type,
  written_review TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    review.id,
    review.group_id,
    review.reviewer_id,
    review.reviewee_id,
    reviewer.display_name,
    reviewer.avatar_url,
    grp.name,
    grp.type,
    review.written_review,
    review.created_at,
    review.updated_at
  FROM public.group_reviews review
  JOIN public.profiles reviewer
    ON reviewer.id = review.reviewer_id
  JOIN public.groups grp
    ON grp.id = review.group_id
  WHERE review.reviewee_id = profile_id_input
    AND review.written_review IS NOT NULL
    AND char_length(trim(review.written_review)) > 0
  ORDER BY review.updated_at DESC
  LIMIT GREATEST(COALESCE(limit_input, 20), 0)
  OFFSET GREATEST(COALESCE(offset_input, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_profile_review_summary(
  profile_id_input UUID
)
RETURNS TABLE(
  reviewee_id UUID,
  received_review_count INTEGER,
  written_review_count INTEGER,
  reliability_average NUMERIC(4,2),
  communication_average NUMERIC(4,2),
  contribution_average NUMERIC(4,2),
  overall_average NUMERIC(4,2),
  badge_tier badge_tier
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    profile_id_input,
    COUNT(review.id)::INTEGER AS received_review_count,
    COUNT(review.id) FILTER (
      WHERE review.written_review IS NOT NULL
        AND char_length(trim(review.written_review)) > 0
    )::INTEGER AS written_review_count,
    ROUND(AVG(review.reliability_score::NUMERIC), 2) AS reliability_average,
    ROUND(AVG(review.communication_score::NUMERIC), 2) AS communication_average,
    ROUND(AVG(review.contribution_score::NUMERIC), 2) AS contribution_average,
    ROUND(AVG((review.reliability_score + review.communication_score + review.contribution_score)::NUMERIC / 3), 2)
      AS overall_average,
    profile.badge_tier
  FROM public.profiles profile
  LEFT JOIN public.group_reviews review
    ON review.reviewee_id = profile.id
  WHERE profile.id = profile_id_input
  GROUP BY profile.id, profile.badge_tier;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_review_eligibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_profile_reviews(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_review_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_group_review(
  UUID,
  UUID,
  SMALLINT,
  SMALLINT,
  SMALLINT,
  TEXT
) TO authenticated;
