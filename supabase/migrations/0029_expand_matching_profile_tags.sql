-- Milestone 3 matching expansion: add study-mode, project-tag, and CCA-tag
-- profile fields without removing the legacy study_style column yet.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS study_mode TEXT,
  ADD COLUMN IF NOT EXISTS project_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cca_tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET study_mode = study_style
WHERE study_mode IS NULL
  AND study_style IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_study_mode_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_study_mode_check CHECK (
    study_mode IS NULL
    OR study_mode IN ('online', 'in_person', 'flexible')
  );
