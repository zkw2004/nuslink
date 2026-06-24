-- Matching redesign cleanup: remove deprecated target-grade data from live matching.

ALTER TABLE public.user_modules
  DROP COLUMN IF EXISTS target_grade;
