-- Onboarding support: avatar uploads and safe module registration from NUSMods.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own_folder" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.upsert_user_module(
  module_code_input TEXT,
  module_name_input TEXT,
  module_department_input TEXT,
  module_faculty_input TEXT,
  semester_input TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.user_modules (user_id, module_code, semester)
  VALUES (auth.uid(), upper(trim(module_code_input)), semester_input)
  ON CONFLICT (user_id, module_code, semester) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_module(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
