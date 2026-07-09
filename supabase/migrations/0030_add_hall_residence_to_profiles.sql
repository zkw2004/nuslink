-- Matching refactor: restore a lightweight hall / residence field for
-- shared-context matching and profile display.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hall_residence TEXT CHECK (
    hall_residence IS NULL
    OR char_length(trim(hall_residence)) <= 80
  );
