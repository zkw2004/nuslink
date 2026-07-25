-- AI moderation foundation for user-generated text.
-- This migration records moderation decisions and adds outcome columns that
-- later write/read paths can use to hide or reject unsafe content.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_subject_type') THEN
    CREATE TYPE public.moderation_subject_type AS ENUM (
      'profile_bio',
      'group_name',
      'group_description',
      'group_tag',
      'community_name',
      'community_description',
      'community_tag',
      'direct_chat_message',
      'group_chat_message',
      'community_chat_message'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_outcome') THEN
    CREATE TYPE public.moderation_outcome AS ENUM (
      'allowed',
      'flagged',
      'blocked',
      'error'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_category') THEN
    CREATE TYPE public.moderation_category AS ENUM (
      'illegal_activity',
      'commercial_spam',
      'harassment',
      'hate_speech',
      'explicit_content',
      'spam_phishing',
      'impersonation',
      'other'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.content_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type public.moderation_subject_type NOT NULL,
  subject_id UUID,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_table TEXT,
  source_column TEXT,
  content_hash TEXT NOT NULL,
  content_excerpt TEXT NOT NULL,
  outcome public.moderation_outcome NOT NULL,
  categories public.moderation_category[] NOT NULL DEFAULT '{}',
  confidence NUMERIC CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  reason TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  provider_model TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_moderation_events_actor_created
  ON public.content_moderation_events (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_moderation_events_subject
  ON public.content_moderation_events (subject_type, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_moderation_events_outcome_created
  ON public.content_moderation_events (outcome, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS moderation_outcome public.moderation_outcome
  NOT NULL DEFAULT 'allowed';

CREATE OR REPLACE FUNCTION public.is_content_visible(
  outcome public.moderation_outcome
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT outcome IN ('allowed', 'error');
$$;

ALTER TABLE public.content_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_moderation_events_select_own"
  ON public.content_moderation_events;
CREATE POLICY "content_moderation_events_select_own"
  ON public.content_moderation_events
  FOR SELECT
  USING (auth.uid() = actor_id);

REVOKE ALL ON TABLE public.content_moderation_events FROM anon;
REVOKE ALL ON TABLE public.content_moderation_events FROM authenticated;
GRANT SELECT ON TABLE public.content_moderation_events TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_content_visible(public.moderation_outcome)
  TO authenticated;
