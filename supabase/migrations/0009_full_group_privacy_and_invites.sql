-- M2 group privacy support: public, semi-private restrictions, and private invite codes.

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS semester TEXT;

UPDATE public.groups
SET semester = 'AY2526S2'
WHERE semester IS NULL;

ALTER TABLE public.groups
ALTER COLUMN semester SET NOT NULL;

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

ALTER TABLE public.groups
DROP CONSTRAINT IF EXISTS groups_privacy_restriction_check;

ALTER TABLE public.groups
ADD CONSTRAINT groups_privacy_restriction_check CHECK (
  (privacy = 'semi_private' AND restriction IS NOT NULL)
  OR (privacy <> 'semi_private' AND restriction IS NULL)
);

ALTER TABLE public.groups
DROP CONSTRAINT IF EXISTS groups_private_invite_code_check;

ALTER TABLE public.groups
ADD CONSTRAINT groups_private_invite_code_check CHECK (
  privacy <> 'private'
  OR invite_code IS NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_groups_semester
  ON public.groups (semester)
  WHERE is_active = TRUE;

DROP POLICY IF EXISTS "groups_select_public" ON public.groups;

CREATE POLICY "groups_select_visible" ON public.groups
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND is_active = TRUE
    AND (
      privacy = 'public'
      OR creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = groups.id
          AND gm.user_id = auth.uid()
      )
      OR (
        privacy = 'semi_private'
        AND (
          (
            restriction = 'same_module'
            AND EXISTS (
              SELECT 1 FROM public.user_modules um
              WHERE um.user_id = auth.uid()
                AND um.module_code = groups.module_code
                AND um.semester = groups.semester
            )
          )
          OR (
            restriction = 'same_year'
            AND EXISTS (
              SELECT 1
              FROM public.profiles viewer
              JOIN public.profiles creator ON creator.id = groups.creator_id
              WHERE viewer.id = auth.uid()
                AND viewer.year_of_study IS NOT NULL
                AND viewer.year_of_study = creator.year_of_study
            )
          )
          OR (
            restriction = 'same_faculty'
            AND EXISTS (
              SELECT 1
              FROM public.profiles viewer
              JOIN public.profiles creator ON creator.id = groups.creator_id
              WHERE viewer.id = auth.uid()
                AND viewer.faculty IS NOT NULL
                AND creator.faculty IS NOT NULL
                AND lower(viewer.faculty) = lower(creator.faculty)
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;

CREATE OR REPLACE FUNCTION public.make_group_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_join_group(
  group_id_input UUID,
  user_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  viewer_profile public.profiles%ROWTYPE;
  creator_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF target_group.creator_id = user_id_input THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_id_input
      AND user_id = user_id_input
  ) THEN
    RETURN TRUE;
  END IF;

  IF target_group.privacy = 'public' THEN
    RETURN TRUE;
  END IF;

  IF target_group.privacy = 'private' THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO viewer_profile
  FROM public.profiles
  WHERE id = user_id_input;

  SELECT * INTO creator_profile
  FROM public.profiles
  WHERE id = target_group.creator_id;

  IF target_group.restriction = 'same_module' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_modules
      WHERE user_id = user_id_input
        AND module_code = target_group.module_code
        AND semester = target_group.semester
    );
  END IF;

  IF target_group.restriction = 'same_year' THEN
    RETURN viewer_profile.year_of_study IS NOT NULL
      AND viewer_profile.year_of_study = creator_profile.year_of_study;
  END IF;

  IF target_group.restriction = 'same_faculty' THEN
    RETURN viewer_profile.faculty IS NOT NULL
      AND creator_profile.faculty IS NOT NULL
      AND lower(viewer_profile.faculty) = lower(creator_profile.faculty);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group(
  module_code_input TEXT,
  module_name_input TEXT,
  module_department_input TEXT,
  module_faculty_input TEXT,
  group_name_input TEXT,
  group_type_input group_type,
  privacy_input privacy_setting,
  restriction_input semi_private_restriction,
  semester_input TEXT,
  description_input TEXT,
  min_size_input SMALLINT,
  max_size_input SMALLINT,
  venue_input TEXT
)
RETURNS TABLE(group_id UUID, invite_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_group_id UUID;
  generated_invite_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF privacy_input = 'semi_private' AND restriction_input IS NULL THEN
    RAISE EXCEPTION 'Choose a semi-private restriction';
  END IF;

  IF privacy_input <> 'semi_private' AND restriction_input IS NOT NULL THEN
    RAISE EXCEPTION 'Restrictions only apply to semi-private groups';
  END IF;

  IF min_size_input IS NOT NULL AND max_size_input IS NOT NULL
    AND min_size_input > max_size_input THEN
    RAISE EXCEPTION 'Minimum size cannot be greater than maximum size';
  END IF;

  INSERT INTO public.modules (code, name, department, faculty)
  VALUES (
    upper(trim(module_code_input)),
    trim(module_name_input),
    nullif(trim(module_department_input), ''),
    nullif(trim(module_faculty_input), '')
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    faculty = EXCLUDED.faculty;

  IF privacy_input = 'private' THEN
    LOOP
      generated_invite_code := public.make_group_invite_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.groups WHERE invite_code = generated_invite_code
      );
    END LOOP;
  END IF;

  INSERT INTO public.groups (
    name,
    type,
    module_code,
    privacy,
    restriction,
    semester,
    description,
    min_size,
    max_size,
    venue,
    creator_id,
    invite_code
  )
  VALUES (
    trim(group_name_input),
    group_type_input,
    upper(trim(module_code_input)),
    privacy_input,
    restriction_input,
    semester_input,
    nullif(trim(description_input), ''),
    min_size_input,
    max_size_input,
    nullif(trim(venue_input), ''),
    auth.uid(),
    generated_invite_code
  )
  RETURNING id INTO created_group_id;

  group_id := created_group_id;
  invite_code := generated_invite_code;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  group_type,
  privacy_setting,
  semi_private_restriction,
  TEXT,
  TEXT,
  SMALLINT,
  SMALLINT,
  TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_public_group(
  module_code_input TEXT,
  module_name_input TEXT,
  module_department_input TEXT,
  module_faculty_input TEXT,
  group_name_input TEXT,
  group_type_input group_type
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_group_id UUID;
BEGIN
  SELECT group_id INTO created_group_id
  FROM public.create_group(
    module_code_input,
    module_name_input,
    module_department_input,
    module_faculty_input,
    group_name_input,
    group_type_input,
    'public',
    NULL,
    'AY2526S2',
    '',
    NULL,
    NULL,
    ''
  );

  RETURN created_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_group(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  group_type
) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_visible_group(group_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF target_group.privacy = 'private' THEN
    RAISE EXCEPTION 'Private groups require an invite code';
  END IF;

  IF NOT public.user_can_join_group(group_id_input, auth.uid()) THEN
    RAISE EXCEPTION 'You do not meet this group restriction';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (group_id_input, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_visible_group(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_group_with_invite(invite_code_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO target_group_id
  FROM public.groups
  WHERE invite_code = upper(trim(invite_code_input))
    AND privacy = 'private'
    AND is_active = TRUE;

  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (target_group_id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN target_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_with_invite(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_discover_groups(semester_input TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type group_type,
  module_code TEXT,
  description TEXT,
  creator_id UUID,
  privacy privacy_setting,
  restriction semi_private_restriction,
  semester TEXT,
  joined BOOLEAN,
  can_join BOOLEAN,
  join_note TEXT,
  invite_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.type,
    g.module_code,
    CASE
      WHEN g.privacy = 'private'
        AND g.creator_id <> auth.uid()
        AND NOT EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = g.id
            AND gm.user_id = auth.uid()
        )
        THEN NULL
      ELSE g.description
    END AS description,
    g.creator_id,
    g.privacy,
    g.restriction,
    g.semester,
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = g.id
        AND gm.user_id = auth.uid()
    ) AS joined,
    (
      NOT EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
      )
      AND g.privacy <> 'private'
      AND public.user_can_join_group(g.id, auth.uid())
    ) AS can_join,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
      ) THEN 'Already joined'
      WHEN g.creator_id = auth.uid() THEN 'You created this group'
      WHEN g.privacy = 'public' THEN 'Open to all app users'
      WHEN g.privacy = 'private' THEN 'Invite code required'
      WHEN public.user_can_join_group(g.id, auth.uid()) THEN 'You meet this group restriction'
      ELSE 'Restricted to eligible students'
    END AS join_note,
    CASE
      WHEN g.creator_id = auth.uid() THEN g.invite_code
      ELSE NULL
    END AS invite_code
  FROM public.groups g
  WHERE g.is_active = TRUE
    AND g.semester = semester_input
  ORDER BY g.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_groups(TEXT) TO authenticated;
