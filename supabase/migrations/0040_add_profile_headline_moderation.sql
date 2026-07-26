-- Extend profile moderation to cover the dedicated headline field.

ALTER TYPE public.moderation_subject_type
  ADD VALUE IF NOT EXISTS 'profile_headline';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline_moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';
