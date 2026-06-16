-- Milestone 2 community creation: persist lightweight searchable tags.

ALTER TABLE public.communities
ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX idx_communities_tags
  ON public.communities USING GIN (tags);
