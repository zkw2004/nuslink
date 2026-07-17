CREATE TABLE public.tag_normalization_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type TEXT NOT NULL CHECK (tag_type IN ('interest', 'project', 'cca')),
  normalized_raw_tag TEXT NOT NULL CHECK (char_length(trim(normalized_raw_tag)) > 0),
  first_raw_tag TEXT NOT NULL CHECK (char_length(trim(first_raw_tag)) > 0),
  last_raw_tag TEXT NOT NULL CHECK (char_length(trim(last_raw_tag)) > 0),
  resolution_source TEXT NOT NULL CHECK (resolution_source IN ('passthrough')),
  canonical_tags TEXT[] NOT NULL DEFAULT '{}',
  matched BOOLEAN NOT NULL DEFAULT FALSE,
  seen_count INTEGER NOT NULL DEFAULT 1 CHECK (seen_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tag_type, normalized_raw_tag)
);

CREATE TRIGGER tag_normalization_memory_updated_at
  BEFORE UPDATE ON public.tag_normalization_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tag_normalization_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_normalization_memory_service_role_only"
  ON public.tag_normalization_memory
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE INDEX idx_tag_normalization_memory_lookup
  ON public.tag_normalization_memory (tag_type, normalized_raw_tag);
