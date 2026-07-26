-- Milestone 3 push notification device registration and durable delivery queue.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token    TEXT NOT NULL UNIQUE,
  platform           TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_select_owner" ON public.push_tokens;
CREATE POLICY "push_tokens_select_owner" ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_enabled
  ON public.push_tokens (user_id)
  WHERE enabled = TRUE;

CREATE TABLE IF NOT EXISTS public.notification_push_deliveries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id    UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  push_token_id      UUID NOT NULL REFERENCES public.push_tokens(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'ticketed', 'delivered', 'failed', 'cancelled')),
  attempt_count      INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_at      TIMESTAMPTZ,
  expo_ticket_id     TEXT,
  ticketed_at        TIMESTAMPTZ,
  receipt_checked_at TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  last_error         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, push_token_id)
);

ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_deliveries_pending
  ON public.notification_push_deliveries (next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_push_deliveries_receipts
  ON public.notification_push_deliveries (ticketed_at)
  WHERE status = 'ticketed';

CREATE OR REPLACE FUNCTION public.register_push_token(
  expo_push_token_input TEXT,
  platform_input TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  token_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF platform_input NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'Unsupported push platform';
  END IF;

  IF expo_push_token_input !~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$' THEN
    RAISE EXCEPTION 'Invalid Expo push token';
  END IF;

  UPDATE public.notification_push_deliveries delivery
  SET status = 'cancelled',
      processing_at = NULL,
      last_error = 'Push token was registered to another account.',
      updated_at = NOW()
  FROM public.push_tokens token
  WHERE delivery.push_token_id = token.id
    AND token.expo_push_token = expo_push_token_input
    AND token.user_id <> current_user_id
    AND delivery.status IN ('pending', 'processing');

  INSERT INTO public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    enabled,
    updated_at,
    last_registered_at
  )
  VALUES (
    current_user_id,
    expo_push_token_input,
    platform_input,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (expo_push_token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      enabled = TRUE,
      updated_at = NOW(),
      last_registered_at = NOW()
  RETURNING id INTO token_id;

  RETURN token_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_push_token(expo_push_token_input TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.notification_push_deliveries delivery
  SET status = 'cancelled',
      processing_at = NULL,
      last_error = 'Push notifications were disabled on this device.',
      updated_at = NOW()
  FROM public.push_tokens token
  WHERE delivery.push_token_id = token.id
    AND token.user_id = current_user_id
    AND token.expo_push_token = expo_push_token_input
    AND delivery.status IN ('pending', 'processing');

  UPDATE public.push_tokens
  SET enabled = FALSE,
      updated_at = NOW()
  WHERE user_id = current_user_id
    AND expo_push_token = expo_push_token_input;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.unregister_push_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push_deliveries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_push_deliveries (notification_id, push_token_id)
  SELECT NEW.id, token.id
  FROM public.push_tokens token
  WHERE token.user_id = NEW.recipient_id
    AND token.enabled = TRUE
  ON CONFLICT (notification_id, push_token_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_push ON public.notifications;
CREATE TRIGGER notifications_enqueue_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push_deliveries();

CREATE OR REPLACE FUNCTION public.claim_pending_push_deliveries(batch_size_input INTEGER DEFAULT 100)
RETURNS TABLE (
  delivery_id UUID,
  push_token_id UUID,
  expo_push_token TEXT,
  notification_id UUID,
  title TEXT,
  body TEXT,
  href TEXT,
  notification_type TEXT,
  attempt_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT delivery.id
    FROM public.notification_push_deliveries delivery
    JOIN public.push_tokens token ON token.id = delivery.push_token_id
    JOIN public.notifications notification ON notification.id = delivery.notification_id
    WHERE token.enabled = TRUE
      AND token.user_id = notification.recipient_id
      AND delivery.attempt_count < 5
      AND delivery.next_attempt_at <= NOW()
      AND (
        delivery.status = 'pending'
        OR (
          delivery.status = 'processing'
          AND delivery.processing_at < NOW() - INTERVAL '5 minutes'
        )
      )
    ORDER BY delivery.created_at
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT LEAST(GREATEST(batch_size_input, 1), 100)
  ), claimed AS (
    UPDATE public.notification_push_deliveries delivery
    SET status = 'processing',
        attempt_count = delivery.attempt_count + 1,
        processing_at = NOW(),
        updated_at = NOW()
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*
  )
  SELECT
    claimed.id,
    token.id,
    token.expo_push_token,
    notification.id,
    notification.title,
    notification.body,
    notification.href,
    notification.type::TEXT,
    claimed.attempt_count
  FROM claimed
  JOIN public.push_tokens token ON token.id = claimed.push_token_id
  JOIN public.notifications notification ON notification.id = claimed.notification_id;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_push_receipts(batch_size_input INTEGER DEFAULT 1000)
RETURNS TABLE (
  delivery_id UUID,
  push_token_id UUID,
  expo_ticket_id TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT delivery.id
    FROM public.notification_push_deliveries delivery
    WHERE delivery.status = 'ticketed'
      AND delivery.expo_ticket_id IS NOT NULL
      AND delivery.ticketed_at <= NOW() - INTERVAL '15 minutes'
      AND (
        delivery.receipt_checked_at IS NULL
        OR delivery.receipt_checked_at <= NOW() - INTERVAL '5 minutes'
      )
    ORDER BY delivery.ticketed_at
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT LEAST(GREATEST(batch_size_input, 1), 1000)
  ), claimed AS (
    UPDATE public.notification_push_deliveries delivery
    SET receipt_checked_at = NOW(),
        updated_at = NOW()
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.id, delivery.push_token_id, delivery.expo_ticket_id
  )
  SELECT claimed.id, claimed.push_token_id, claimed.expo_ticket_id
  FROM claimed;
$$;

REVOKE ALL ON FUNCTION public.claim_push_receipts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_push_receipts(INTEGER) TO service_role;
