-- Milestone 3 smart nudges: per-user controls and notification categories.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'nudge_time';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'nudge_behaviour';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'nudge_network';

CREATE TABLE IF NOT EXISTS public.nudge_preferences (
  user_id           UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  time_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  behaviour_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  network_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nudge_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nudge_preferences_select_own"
  ON public.nudge_preferences;
CREATE POLICY "nudge_preferences_select_own"
  ON public.nudge_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "nudge_preferences_insert_own"
  ON public.nudge_preferences;
CREATE POLICY "nudge_preferences_insert_own"
  ON public.nudge_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nudge_preferences_update_own"
  ON public.nudge_preferences;
CREATE POLICY "nudge_preferences_update_own"
  ON public.nudge_preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS nudge_preferences_updated_at
  ON public.nudge_preferences;
CREATE TRIGGER nudge_preferences_updated_at
  BEFORE UPDATE ON public.nudge_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
