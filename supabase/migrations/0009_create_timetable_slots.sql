-- Milestone 2 matching groundwork: store per-semester availability blocks
-- so schedule overlap can be computed in the FastAPI matching service.

CREATE TABLE public.timetable_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester      TEXT NOT NULL,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_minute  SMALLINT NOT NULL CHECK (start_minute BETWEEN 0 AND 1438),
  end_minute    SMALLINT NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'nusmods')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_minute > start_minute),
  UNIQUE (user_id, semester, day_of_week, start_minute, end_minute)
);

CREATE TRIGGER timetable_slots_updated_at
  BEFORE UPDATE ON public.timetable_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timetable_slots_select_own" ON public.timetable_slots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "timetable_slots_insert_own" ON public.timetable_slots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timetable_slots_update_own" ON public.timetable_slots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "timetable_slots_delete_own" ON public.timetable_slots
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_timetable_slots_user_semester
  ON public.timetable_slots (user_id, semester);
