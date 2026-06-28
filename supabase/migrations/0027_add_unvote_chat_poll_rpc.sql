-- Allow users to remove their poll vote without choosing another option.

CREATE OR REPLACE FUNCTION public.unvote_chat_poll(
  poll_id_input UUID
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

  IF poll_id_input IS NULL THEN
    RAISE EXCEPTION 'Poll is required';
  END IF;

  IF NOT public.can_access_chat_poll(poll_id_input) THEN
    RAISE EXCEPTION 'You do not have access to this poll';
  END IF;

  DELETE FROM public.chat_poll_votes
  WHERE poll_id = poll_id_input
    AND user_id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unvote_chat_poll(UUID) TO authenticated;
