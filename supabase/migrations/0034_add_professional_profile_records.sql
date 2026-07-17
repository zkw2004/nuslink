-- Review-first professional profile records created from manual or AI-assisted input.
-- Resume files and raw AI responses are intentionally not persisted.

CREATE TABLE public.profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (label IN ('linkedin', 'github', 'portfolio', 'other')),
  url TEXT NOT NULL CHECK (
    char_length(url) <= 500
    AND (url LIKE 'https://%' OR url LIKE 'http://%')
  ),
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profile_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('work', 'project', 'competition')),
  title TEXT NOT NULL CHECK (char_length(title) <= 140),
  organization TEXT CHECK (char_length(organization) <= 140),
  date_label TEXT CHECK (char_length(date_label) <= 80),
  description TEXT CHECK (char_length(description) <= 500),
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profile_links_updated_at
  BEFORE UPDATE ON public.profile_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profile_entries_updated_at
  BEFORE UPDATE ON public.profile_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_links_select_visible_or_own" ON public.profile_links
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (is_visible OR auth.uid() = user_id)
  );

CREATE POLICY "profile_links_insert_own" ON public.profile_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_links_update_own" ON public.profile_links
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_links_delete_own" ON public.profile_links
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "profile_entries_select_visible_or_own" ON public.profile_entries
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (is_visible OR auth.uid() = user_id)
  );

CREATE POLICY "profile_entries_insert_own" ON public.profile_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_entries_update_own" ON public.profile_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_entries_delete_own" ON public.profile_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_profile_links_user ON public.profile_links (user_id);
CREATE INDEX idx_profile_entries_user ON public.profile_entries (user_id);
CREATE INDEX idx_profile_entries_visible
  ON public.profile_entries (user_id, category)
  WHERE is_visible = TRUE;

CREATE OR REPLACE FUNCTION public.apply_profile_import(
  bio_input TEXT,
  skills_input TEXT[],
  interests_input TEXT[],
  cca_tags_input TEXT[],
  links_input JSONB,
  entries_input JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
  SET
    bio = COALESCE(bio_input, bio),
    skills = COALESCE(skills_input, skills),
    interests = COALESCE(interests_input, interests),
    cca_tags = COALESCE(cca_tags_input, cca_tags)
  WHERE id = current_user_id;

  INSERT INTO public.profile_links (user_id, label, url, is_visible)
  SELECT
    current_user_id,
    item->>'label',
    item->>'url',
    COALESCE((item->>'is_visible')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(COALESCE(links_input, '[]'::JSONB)) AS item;

  INSERT INTO public.profile_entries (
    user_id,
    category,
    title,
    organization,
    date_label,
    description,
    is_visible
  )
  SELECT
    current_user_id,
    item->>'category',
    item->>'title',
    NULLIF(item->>'organization', ''),
    NULLIF(item->>'date_label', ''),
    NULLIF(item->>'description', ''),
    COALESCE((item->>'is_visible')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(COALESCE(entries_input, '[]'::JSONB)) AS item;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_profile_import(
  TEXT,
  TEXT[],
  TEXT[],
  TEXT[],
  JSONB,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_profile_import(
  TEXT,
  TEXT[],
  TEXT[],
  TEXT[],
  JSONB,
  JSONB
) TO authenticated;
