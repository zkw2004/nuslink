-- Fix recursive RLS on group_members.
-- M1 only needs users to read their own memberships for joined-state checks.

DROP POLICY IF EXISTS "group_members_select" ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id);
