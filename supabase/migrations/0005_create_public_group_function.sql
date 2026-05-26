-- Support M1 public group creation without exposing direct writes to modules.

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

  INSERT INTO public.groups (name, type, module_code, privacy, creator_id)
  VALUES (
    trim(group_name_input),
    group_type_input,
    upper(trim(module_code_input)),
    'public',
    auth.uid()
  )
  RETURNING id INTO created_group_id;

  RETURN created_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_group(TEXT, TEXT, TEXT, TEXT, TEXT, group_type) TO authenticated;
