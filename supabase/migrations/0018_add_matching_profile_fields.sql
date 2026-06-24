-- Matching redesign: add lightweight profile fields for richer compatibility scoring.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hall_rc TEXT CHECK (
    hall_rc IS NULL OR char_length(trim(hall_rc)) <= 80
  ),
  ADD COLUMN IF NOT EXISTS study_style TEXT CHECK (
    study_style IS NULL
    OR study_style IN ('library', 'cafe', 'home', 'flexible')
  ),
  ADD COLUMN IF NOT EXISTS preferred_group_size SMALLINT CHECK (
    preferred_group_size IS NULL
    OR preferred_group_size BETWEEN 1 AND 8
  );
