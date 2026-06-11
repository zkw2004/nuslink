-- Milestone 2 connection system: request/accept flow now, DM gating later.

CREATE TYPE connection_request_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

CREATE TABLE public.connection_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        connection_request_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  CHECK (requester_id <> recipient_id),
  UNIQUE (requester_id, recipient_id)
);

CREATE TABLE public.connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a_id <> user_b_id),
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connection_requests_select_participants" ON public.connection_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR auth.uid() = recipient_id
  );

CREATE POLICY "connections_select_participants" ON public.connections
  FOR SELECT USING (
    auth.uid() = user_a_id
    OR auth.uid() = user_b_id
  );

CREATE OR REPLACE FUNCTION public.create_connection_request(
  recipient_id_input UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_request RECORD;
  existing_connection RECORD;
  request_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF recipient_id_input IS NULL OR recipient_id_input = current_user_id THEN
    RAISE EXCEPTION 'Choose another user before sending a connection request';
  END IF;

  SELECT id INTO existing_connection
  FROM public.connections
  WHERE user_a_id = LEAST(current_user_id, recipient_id_input)
    AND user_b_id = GREATEST(current_user_id, recipient_id_input)
  LIMIT 1;

  IF existing_connection.id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already connected with this user';
  END IF;

  SELECT id, status INTO existing_request
  FROM public.connection_requests
  WHERE requester_id = current_user_id
    AND recipient_id = recipient_id_input
  LIMIT 1;

  IF existing_request.id IS NOT NULL THEN
    IF existing_request.status = 'pending' THEN
      RETURN existing_request.id;
    END IF;

    UPDATE public.connection_requests
    SET status = 'pending',
        responded_at = NULL,
        created_at = NOW()
    WHERE id = existing_request.id;

    RETURN existing_request.id;
  END IF;

  SELECT id, status INTO existing_request
  FROM public.connection_requests
  WHERE requester_id = recipient_id_input
    AND recipient_id = current_user_id
  LIMIT 1;

  IF existing_request.id IS NOT NULL AND existing_request.status = 'pending' THEN
    RAISE EXCEPTION 'This user has already sent you a connection request';
  END IF;

  INSERT INTO public.connection_requests (requester_id, recipient_id)
  VALUES (current_user_id, recipient_id_input)
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_connection_request(
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
  target_request public.connection_requests%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF decision_input NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid connection request decision';
  END IF;

  SELECT * INTO target_request
  FROM public.connection_requests
  WHERE id = request_id_input
    AND recipient_id = current_user_id
  LIMIT 1;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Connection request not found';
  END IF;

  IF target_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Connection request has already been handled';
  END IF;

  UPDATE public.connection_requests
  SET status = decision_input::connection_request_status,
      responded_at = NOW()
  WHERE id = target_request.id;

  IF decision_input = 'accepted' THEN
    INSERT INTO public.connections (user_a_id, user_b_id)
    VALUES (
      LEAST(target_request.requester_id, target_request.recipient_id),
      GREATEST(target_request.requester_id, target_request.recipient_id)
    )
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_connection_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_connection_request(UUID, TEXT) TO authenticated;

CREATE INDEX idx_connection_requests_requester
  ON public.connection_requests (requester_id, status);
CREATE INDEX idx_connection_requests_recipient
  ON public.connection_requests (recipient_id, status);
CREATE INDEX idx_connections_user_a ON public.connections (user_a_id);
CREATE INDEX idx_connections_user_b ON public.connections (user_b_id);
