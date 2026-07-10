CREATE TYPE match_feedback_event_type AS ENUM (
  'view',
  'skip',
  'accept',
  'chat_start'
);

CREATE TABLE public.match_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type match_feedback_event_type NOT NULL,
  semester TEXT,
  module_code TEXT,
  compatibility_percentage INTEGER CHECK (
    compatibility_percentage IS NULL
    OR compatibility_percentage BETWEEN 0 AND 100
  ),
  top_signals TEXT[] NOT NULL DEFAULT '{}',
  shared_modules TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (actor_user_id <> target_user_id)
);

ALTER TABLE public.match_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_feedback_events_select_own" ON public.match_feedback_events
  FOR SELECT USING (
    auth.uid() = actor_user_id
    OR auth.uid() = target_user_id
  );

CREATE POLICY "match_feedback_events_insert_actor" ON public.match_feedback_events
  FOR INSERT WITH CHECK (auth.uid() = actor_user_id);

CREATE INDEX idx_match_feedback_actor_created
  ON public.match_feedback_events (actor_user_id, created_at DESC);

CREATE INDEX idx_match_feedback_target_created
  ON public.match_feedback_events (target_user_id, created_at DESC);

CREATE INDEX idx_match_feedback_type_created
  ON public.match_feedback_events (event_type, created_at DESC);
