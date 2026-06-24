-- Align year-of-study limits with NUS undergraduate duration.

UPDATE public.profiles
SET year_of_study = 5
WHERE year_of_study > 5;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_year_of_study_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_year_of_study_check
  CHECK (year_of_study IS NULL OR year_of_study BETWEEN 1 AND 5);
