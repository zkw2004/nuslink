-- M1 group owner delete support.

CREATE POLICY "groups_delete_creator" ON public.groups
  FOR DELETE USING (auth.uid() = creator_id);
