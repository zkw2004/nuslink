-- Milestone 2 basic in-app notifications.

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'connection_request',
    'connection_accepted',
    'group_invite',
    'group_activity',
    'high_match'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

CREATE OR REPLACE FUNCTION public.notify_connection_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), 'Someone')
  INTO requester_name
  FROM public.profiles
  WHERE id = NEW.requester_id;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
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
    'connection_request',
    'New connection request',
    requester_name || ' wants to connect with you.',
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
DECLARE
  recipient_name TEXT;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), 'Someone')
  INTO recipient_name
  FROM public.profiles
  WHERE id = NEW.recipient_id;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
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
    'connection_accepted',
    'Connection accepted',
    recipient_name || ' accepted your connection request.',
    '/chats',
    jsonb_build_object('request_id', NEW.id),
    'connection_accepted:' || NEW.id::text
  )
  ON CONFLICT DO NOTHING;

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
    'group_invite',
    'Invite code ready',
    'Share invite code ' || NEW.invite_code || ' for ' || NEW.name || '.',
    '/discover',
    jsonb_build_object('group_id', NEW.id, 'invite_code', NEW.invite_code),
    'group_invite:' || NEW.id::text
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
    'group_activity',
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

DROP TRIGGER IF EXISTS on_group_created_notify
  ON public.groups;
CREATE TRIGGER on_group_created_notify
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_created();

DROP TRIGGER IF EXISTS on_group_member_joined_notify
  ON public.group_members;
CREATE TRIGGER on_group_member_joined_notify
  AFTER INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_member_joined();
