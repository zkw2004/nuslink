ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline TEXT
  CHECK (
    headline IS NULL
    OR char_length(trim(headline)) <= 60
  );
