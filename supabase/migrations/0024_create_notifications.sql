-- Milestone 2 basic in-app notifications.

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'connection_request',
    'connection_accepted',
    'connection_milestone',
    'high_match',
    'group_invite_code',
    'group_invite_received',
    'group_member_joined',
    'resource_shared',
    'system_announcement'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'connection_milestone';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_invite_code';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_invite_received';
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

CREATE TABLE public.notifications (
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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_update_recipient" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX idx_notifications_recipient_created_at
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_unread
  ON public.notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX idx_notifications_recipient_dedupe
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

CREATE OR REPLACE FUNCTION public.notify_group_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.privacy <> 'private' OR NEW.invite_code IS NULL THEN
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
    NEW.creator_id,
    NEW.creator_id,
    NEW.id,
    'group_invite_code',
    'Invite code ready',
    'Share invite code ' || NEW.invite_code || ' for ' || NEW.name || '.',
    '/discover',
    jsonb_build_object('group_id', NEW.id, 'invite_code', NEW.invite_code),
    'group_invite_code:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

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

  IF decision_input = 'accepted' THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (target_invitation.group_id, current_user_id, 'member')
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

DROP TRIGGER IF EXISTS on_group_created_notify
  ON public.groups;
CREATE TRIGGER on_group_created_notify
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_created();

DROP TRIGGER IF EXISTS on_group_invitation_created_notify
  ON public.group_invitations;
CREATE TRIGGER on_group_invitation_created_notify
  AFTER INSERT OR UPDATE OF status ON public.group_invitations
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_invitation_created();

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
