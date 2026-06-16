-- Fix community_members RLS recursion by moving membership lookup into a
-- SECURITY DEFINER helper function, matching the direct-messaging pattern.

CREATE OR REPLACE FUNCTION public.is_community_member(
  community_id_input UUID,
  user_id_input UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members member
    WHERE member.community_id = community_id_input
      AND member.user_id = user_id_input
  );
$$;

DROP POLICY IF EXISTS "community_members_select" ON public.community_members;

CREATE POLICY "community_members_select" ON public.community_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_community_member(community_id)
  );

GRANT EXECUTE ON FUNCTION public.is_community_member(UUID, UUID) TO authenticated;
