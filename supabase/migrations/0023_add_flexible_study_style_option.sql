-- Allow a third study-mode option for users who are open to both online and in-person study.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_study_style_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_study_style_check CHECK (
    study_style IS NULL
    OR study_style IN ('online', 'in_person', 'flexible')
  );
