-- Milestone 2 basic in-app notifications.

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'connection_request',
    'connection_accepted',
    'connection_milestone',
    'high_match',
    'group_invite_received',
    'group_join_requested',
    'group_join_accepted',
    'group_member_joined',
    'resource_shared',
    'system_announcement'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'connection_milestone';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_invite_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_join_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_join_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_member_joined';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resource_shared';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system_announcement';

DO $$
BEGIN
  CREATE TYPE group_invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE group_join_request_status AS ENUM (
    'pending',
    'accepted',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.group_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       group_invitation_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (inviter_id <> recipient_id),
  UNIQUE (group_id, recipient_id)
);

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_invitations_select_participants"
  ON public.group_invitations;

CREATE POLICY "group_invitations_select_participants"
  ON public.group_invitations
  FOR SELECT USING (
    auth.uid() = inviter_id
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = group_invitations.group_id
        AND member.user_id = auth.uid()
        AND member.role IN ('admin', 'co_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_group_invitations_recipient_status
  ON public.group_invitations (recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_invitations_group_status
  ON public.group_invitations (group_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       group_join_request_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (group_id, requester_id)
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_join_requests_select_participants"
  ON public.group_join_requests;

CREATE POLICY "group_join_requests_select_participants"
  ON public.group_join_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = group_join_requests.group_id
        AND member.user_id = auth.uid()
        AND member.role IN ('admin', 'co_admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.groups target_group
      WHERE target_group.id = group_join_requests.group_id
        AND target_group.creator_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_group_join_requests_requester_status
  ON public.group_join_requests (requester_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_status
  ON public.group_join_requests (group_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id     UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  title        TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  body         TEXT NOT NULL DEFAULT '',
  href         TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key   TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS group_id UUID
REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_recipient"
  ON public.notifications;

CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications_update_recipient"
  ON public.notifications;

CREATE POLICY "notifications_update_recipient" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_recipient_dedupe
  ON public.notifications (recipient_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profile_display_name(profile_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT NULLIF(display_name, '')
      FROM public.profiles
      WHERE id = profile_id
    ),
    'Someone'
  )
$$;

CREATE OR REPLACE FUNCTION public.notify_connection_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    NEW.recipient_id,
    NEW.requester_id,
    NULL,
    'connection_request',
    'New connection request',
    public.profile_display_name(NEW.requester_id)
      || ' wants to connect with you.',
    '/people',
    jsonb_build_object('request_id', NEW.id),
    'connection_request:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_connection_request_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    NEW.requester_id,
    NEW.recipient_id,
    NULL,
    'connection_accepted',
    'Connection accepted',
    public.profile_display_name(NEW.recipient_id)
      || ' accepted your connection request.',
    '/chats',
    jsonb_build_object('request_id', NEW.id),
    'connection_accepted:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_connection_milestone_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_id UUID;
  connection_count INTEGER;
BEGIN
  FOREACH participant_id IN ARRAY ARRAY[NEW.user_a_id, NEW.user_b_id]
  LOOP
    SELECT COUNT(*)
    INTO connection_count
    FROM public.connections
    WHERE user_a_id = participant_id
      OR user_b_id = participant_id;

    IF connection_count IN (10, 25, 50) THEN
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        group_id,
        type,
        title,
        body,
        href,
        metadata,
        dedupe_key
      )
      VALUES (
        participant_id,
        NULL,
        NULL,
        'connection_milestone',
        'Milestone reached',
        'You have made '
          || connection_count::text
          || ' connections. Keep growing your network.',
        '/people',
        jsonb_build_object('milestone_count', connection_count),
        'connection_milestone:'
          || participant_id::text
          || ':'
          || connection_count::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_invitation(
  group_id_input UUID,
  recipient_id_input UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_group public.groups%ROWTYPE;
  existing_invitation public.group_invitations%ROWTYPE;
  invitation_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF recipient_id_input IS NULL OR recipient_id_input = current_user_id THEN
    RAISE EXCEPTION 'Choose another user to invite';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF target_group.id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF target_group.creator_id <> current_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = group_id_input
        AND member.user_id = current_user_id
        AND member.role IN ('admin', 'co_admin')
    ) THEN
    RAISE EXCEPTION 'Only group admins can invite members';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = group_id_input
      AND member.user_id = recipient_id_input
  ) THEN
    RAISE EXCEPTION 'This user is already in the group';
  END IF;

  SELECT * INTO existing_invitation
  FROM public.group_invitations
  WHERE group_id = group_id_input
    AND recipient_id = recipient_id_input;

  IF existing_invitation.id IS NOT NULL THEN
    IF existing_invitation.status = 'pending' THEN
      RETURN existing_invitation.id;
    END IF;

    UPDATE public.group_invitations
    SET inviter_id = current_user_id,
        status = 'pending',
        created_at = NOW(),
        responded_at = NULL
    WHERE id = existing_invitation.id
    RETURNING id INTO invitation_id;

    RETURN invitation_id;
  END IF;

  INSERT INTO public.group_invitations (
    group_id,
    inviter_id,
    recipient_id
  )
  VALUES (
    group_id_input,
    current_user_id,
    recipient_id_input
  )
  RETURNING id INTO invitation_id;

  RETURN invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_group_invitation(
  invitation_id_input UUID,
  decision_input TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_invitation public.group_invitations%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF decision_input NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid invitation decision';
  END IF;

  SELECT * INTO target_invitation
  FROM public.group_invitations
  WHERE id = invitation_id_input
    AND recipient_id = current_user_id;

  IF target_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Group invitation not found';
  END IF;

  IF target_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Group invitation has already been handled';
  END IF;

  UPDATE public.group_invitations
  SET status = decision_input::group_invitation_status,
      responded_at = NOW()
  WHERE id = target_invitation.id;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, NOW())
  WHERE recipient_id = current_user_id
    AND type = 'group_invite_received'
    AND metadata ->> 'invitation_id' = target_invitation.id::text;

  IF decision_input = 'accepted' THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (target_invitation.group_id, current_user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_join_request(
  group_id_input UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_group public.groups%ROWTYPE;
  existing_request public.group_join_requests%ROWTYPE;
  request_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF target_group.id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF target_group.privacy <> 'private' THEN
    RAISE EXCEPTION 'Only private groups require join requests';
  END IF;

  IF target_group.creator_id = current_user_id THEN
    RAISE EXCEPTION 'You already own this group';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = group_id_input
      AND member.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You are already in this group';
  END IF;

  SELECT * INTO existing_request
  FROM public.group_join_requests
  WHERE group_id = group_id_input
    AND requester_id = current_user_id;

  IF existing_request.id IS NOT NULL THEN
    IF existing_request.status = 'pending' THEN
      RETURN existing_request.id;
    END IF;

    UPDATE public.group_join_requests
    SET status = 'pending',
        created_at = NOW(),
        responded_at = NULL,
        responded_by = NULL
    WHERE id = existing_request.id
    RETURNING id INTO request_id;

    RETURN request_id;
  END IF;

  INSERT INTO public.group_join_requests (group_id, requester_id)
  VALUES (group_id_input, current_user_id)
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_group_join_request(
  request_id_input UUID,
  decision_input TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_request public.group_join_requests%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF decision_input NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid join request decision';
  END IF;

  SELECT * INTO target_request
  FROM public.group_join_requests
  WHERE id = request_id_input;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups target_group
    WHERE target_group.id = target_request.group_id
      AND target_group.creator_id = current_user_id
  )
    AND NOT EXISTS (
      SELECT 1
      FROM public.group_members member
      WHERE member.group_id = target_request.group_id
        AND member.user_id = current_user_id
        AND member.role IN ('admin', 'co_admin')
    ) THEN
    RAISE EXCEPTION 'Only group admins can handle join requests';
  END IF;

  IF target_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Join request has already been handled';
  END IF;

  UPDATE public.group_join_requests
  SET status = decision_input::group_join_request_status,
      responded_at = NOW(),
      responded_by = current_user_id
  WHERE id = target_request.id;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, NOW())
  WHERE type = 'group_join_requested'
    AND metadata ->> 'join_request_id' = target_request.id::text;

  IF decision_input = 'accepted' THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (target_request.group_id, target_request.requester_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_group_invitation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = NEW.group_id;

  IF target_group.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    NEW.recipient_id,
    NEW.inviter_id,
    NEW.group_id,
    'group_invite_received',
    'Group invitation',
    public.profile_display_name(NEW.inviter_id)
      || ' invited you to join '
      || target_group.name
      || '.',
    '/discover',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'invitation_id', NEW.id
    ),
    'group_invite_received:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_group_join_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = NEW.group_id;

  IF target_group.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    target_group.creator_id,
    NEW.requester_id,
    NEW.group_id,
    'group_join_requested',
    'Join request received',
    public.profile_display_name(NEW.requester_id)
      || ' requested to join '
      || target_group.name
      || '.',
    '/discover',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'join_request_id', NEW.id
    ),
    'group_join_requested:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_group_join_request_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = NEW.group_id;

  IF target_group.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    NEW.requester_id,
    NEW.responded_by,
    NEW.group_id,
    'group_join_accepted',
    'Join request accepted',
    'Your request to join ' || target_group.name || ' was accepted.',
    '/discover',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'join_request_id', NEW.id
    ),
    'group_join_accepted:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_group_member_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  member_name TEXT;
BEGIN
  SELECT * INTO target_group
  FROM public.groups
  WHERE id = NEW.group_id;

  IF target_group.id IS NULL OR target_group.creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), 'Someone')
  INTO member_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    group_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  VALUES (
    target_group.creator_id,
    NEW.user_id,
    NEW.group_id,
    'group_member_joined',
    'New group member',
    member_name || ' joined ' || target_group.name || '.',
    '/discover',
    jsonb_build_object('group_id', NEW.group_id),
    'group_join:' || NEW.group_id::text || ':' || NEW.user_id::text
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_shared_resource_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  target_community public.communities%ROWTYPE;
  actor_name TEXT;
BEGIN
  actor_name := public.profile_display_name(NEW.owner_id);

  IF NEW.group_id IS NOT NULL THEN
    SELECT * INTO target_group
    FROM public.groups
    WHERE id = NEW.group_id;

    IF target_group.id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      group_id,
      type,
      title,
      body,
      href,
      metadata,
      dedupe_key
    )
    SELECT
      member.user_id,
      NEW.owner_id,
      NEW.group_id,
      'resource_shared',
      'New resource',
      actor_name || ' shared a file in ' || target_group.name || '.',
      '/chats',
      jsonb_build_object(
        'resource_id', NEW.id,
        'group_id', NEW.group_id,
        'file_name', NEW.name
      ),
      'resource_shared:' || NEW.id::text || ':' || member.user_id::text
    FROM public.group_members member
    WHERE member.group_id = NEW.group_id
      AND member.user_id <> NEW.owner_id
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.community_id IS NOT NULL THEN
    SELECT * INTO target_community
    FROM public.communities
    WHERE id = NEW.community_id;

    IF target_community.id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      group_id,
      type,
      title,
      body,
      href,
      metadata,
      dedupe_key
    )
    SELECT
      member.user_id,
      NEW.owner_id,
      NULL,
      'resource_shared',
      'New resource',
      actor_name || ' shared a file in ' || target_community.name || '.',
      '/chats',
      jsonb_build_object(
        'resource_id', NEW.id,
        'community_id', NEW.community_id,
        'file_name', NEW.name
      ),
      'resource_shared:' || NEW.id::text || ':' || member.user_id::text
    FROM public.community_members member
    WHERE member.community_id = NEW.community_id
      AND member.user_id <> NEW.owner_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group(
  module_code_input TEXT,
  module_name_input TEXT,
  module_department_input TEXT,
  module_faculty_input TEXT,
  group_name_input TEXT,
  group_type_input group_type,
  privacy_input privacy_setting,
  restriction_input semi_private_restriction,
  semester_input TEXT,
  description_input TEXT,
  min_size_input SMALLINT,
  max_size_input SMALLINT,
  venue_input TEXT
)
RETURNS TABLE(group_id UUID, invite_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_group_id UUID;
  generated_invite_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF privacy_input = 'semi_private' AND restriction_input IS NULL THEN
    RAISE EXCEPTION 'Choose a semi-private restriction';
  END IF;

  IF privacy_input <> 'semi_private' AND restriction_input IS NOT NULL THEN
    RAISE EXCEPTION 'Restrictions only apply to semi-private groups';
  END IF;

  IF min_size_input IS NOT NULL AND max_size_input IS NOT NULL
    AND min_size_input > max_size_input THEN
    RAISE EXCEPTION 'Minimum size cannot be greater than maximum size';
  END IF;

  INSERT INTO public.modules (code, name, department, faculty)
  VALUES (
    upper(trim(module_code_input)),
    trim(module_name_input),
    nullif(trim(module_department_input), ''),
    nullif(trim(module_faculty_input), '')
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    faculty = EXCLUDED.faculty;

  IF privacy_input = 'private' THEN
    LOOP
      generated_invite_code := public.make_group_invite_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.groups existing_group
        WHERE existing_group.invite_code = generated_invite_code
      );
    END LOOP;
  END IF;

  INSERT INTO public.groups (
    name,
    type,
    module_code,
    privacy,
    restriction,
    semester,
    description,
    min_size,
    max_size,
    venue,
    creator_id,
    invite_code
  )
  VALUES (
    trim(group_name_input),
    group_type_input,
    upper(trim(module_code_input)),
    privacy_input,
    restriction_input,
    semester_input,
    nullif(trim(description_input), ''),
    min_size_input,
    max_size_input,
    nullif(trim(venue_input), ''),
    auth.uid(),
    generated_invite_code
  )
  RETURNING id INTO created_group_id;

  group_id := created_group_id;
  invite_code := generated_invite_code;
  RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS public.get_discover_groups(TEXT);

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
    ) AS joined,
    (
      NOT EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
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

DROP TRIGGER IF EXISTS on_connection_request_created_notify
  ON public.connection_requests;
CREATE TRIGGER on_connection_request_created_notify
  AFTER INSERT ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request_created();

DROP TRIGGER IF EXISTS on_connection_request_updated_notify
  ON public.connection_requests;
CREATE TRIGGER on_connection_request_updated_notify
  AFTER UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request_updated();

DROP TRIGGER IF EXISTS on_connection_created_milestone_notify
  ON public.connections;
CREATE TRIGGER on_connection_created_milestone_notify
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_milestone_created();

DROP TRIGGER IF EXISTS on_group_invitation_created_notify
  ON public.group_invitations;
CREATE TRIGGER on_group_invitation_created_notify
  AFTER INSERT OR UPDATE OF status ON public.group_invitations
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_invitation_created();

DROP TRIGGER IF EXISTS on_group_join_request_created_notify
  ON public.group_join_requests;
CREATE TRIGGER on_group_join_request_created_notify
  AFTER INSERT ON public.group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_join_request_created();

DROP TRIGGER IF EXISTS on_group_join_request_updated_notify
  ON public.group_join_requests;
CREATE TRIGGER on_group_join_request_updated_notify
  AFTER UPDATE OF status ON public.group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_join_request_updated();

DROP TRIGGER IF EXISTS on_group_member_joined_notify
  ON public.group_members;
CREATE TRIGGER on_group_member_joined_notify
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_member_joined();

DROP TRIGGER IF EXISTS on_shared_resource_created_notify
  ON public.shared_resources;
CREATE TRIGGER on_shared_resource_created_notify
  AFTER INSERT ON public.shared_resources
  FOR EACH ROW EXECUTE FUNCTION public.notify_shared_resource_created();

GRANT EXECUTE ON FUNCTION public.create_group_invitation(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_group_invitation(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_join_request(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_group_join_request(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  group_type,
  privacy_setting,
  semi_private_restriction,
  TEXT,
  TEXT,
  SMALLINT,
  SMALLINT,
  TEXT
)
  TO authenticated;
