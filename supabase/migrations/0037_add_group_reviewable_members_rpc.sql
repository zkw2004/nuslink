CREATE OR REPLACE FUNCTION public.get_group_reviewable_members(group_id_input UUID)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  role user_role,
  badge_tier badge_tier
)
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
    FROM public.group_members membership
    WHERE membership.group_id = group_id_input
      AND membership.user_id = current_user_id
      AND membership.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are not an active member of this group';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.display_name,
    profile.avatar_url,
    membership.role,
    profile.badge_tier
  FROM public.group_members membership
  JOIN public.profiles profile
    ON profile.id = membership.user_id
  WHERE membership.group_id = group_id_input
    AND membership.left_at IS NULL
  ORDER BY membership.joined_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_reviewable_members(UUID) TO authenticated;
