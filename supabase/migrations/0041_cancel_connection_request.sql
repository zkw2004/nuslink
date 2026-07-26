CREATE OR REPLACE FUNCTION public.cancel_connection_request(
  recipient_id_input UUID
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

  IF recipient_id_input IS NULL OR recipient_id_input = current_user_id THEN
    RAISE EXCEPTION 'Choose another user before cancelling a request';
  END IF;

  UPDATE public.connection_requests
  SET status = 'declined',
      responded_at = NOW()
  WHERE requester_id = current_user_id
    AND recipient_id = recipient_id_input
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending connection request found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_connection_request(UUID) TO authenticated;
