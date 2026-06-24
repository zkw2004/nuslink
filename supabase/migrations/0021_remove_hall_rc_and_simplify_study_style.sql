-- Matching redesign: remove hall / RC and simplify study style to online vs in person.

UPDATE public.profiles
SET study_style = CASE
  WHEN study_style = 'home' THEN 'online'
  WHEN study_style IN ('library', 'cafe') THEN 'in_person'
  ELSE NULL
END
WHERE study_style IS NOT NULL;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS hall_rc;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_study_style_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_study_style_check CHECK (
    study_style IS NULL
    OR study_style IN ('online', 'in_person')
  );
