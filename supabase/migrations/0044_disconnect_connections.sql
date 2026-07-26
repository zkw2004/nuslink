CREATE OR REPLACE FUNCTION public.disconnect_connection(
  other_user_id_input UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_connection public.connections%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF other_user_id_input IS NULL OR other_user_id_input = current_user_id THEN
    RAISE EXCEPTION 'Choose another user before disconnecting';
  END IF;

  SELECT *
  INTO target_connection
  FROM public.connections
  WHERE user_a_id = LEAST(current_user_id, other_user_id_input)
    AND user_b_id = GREATEST(current_user_id, other_user_id_input)
  LIMIT 1;

  IF target_connection.id IS NULL THEN
    RAISE EXCEPTION 'You are not connected with this user';
  END IF;

  DELETE FROM public.connections
  WHERE id = target_connection.id;

  UPDATE public.direct_conversation_members member
  SET archived_at = NULL,
      deleted_at = NOW()
  WHERE member.user_id IN (current_user_id, other_user_id_input)
    AND member.conversation_id IN (
      SELECT conversation.id
      FROM public.direct_conversations conversation
      WHERE EXISTS (
          SELECT 1
          FROM public.direct_conversation_members member_a
          WHERE member_a.conversation_id = conversation.id
            AND member_a.user_id = current_user_id
        )
        AND EXISTS (
          SELECT 1
          FROM public.direct_conversation_members member_b
          WHERE member_b.conversation_id = conversation.id
            AND member_b.user_id = other_user_id_input
        )
        AND (
          SELECT COUNT(*)
          FROM public.direct_conversation_members member_count
          WHERE member_count.conversation_id = conversation.id
        ) = 2
    );
END;
$$;

REVOKE ALL ON FUNCTION public.disconnect_connection(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disconnect_connection(UUID) TO authenticated;
