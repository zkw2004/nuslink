-- Lightweight community browsing support for the updated M1 Discover surface.

CREATE TYPE community_type AS ENUM (
  'official',
  'user_created'
);

CREATE TYPE community_join_policy AS ENUM (
  'open',
  'request_approval'
);

CREATE TABLE public.communities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (char_length(name) <= 60),
  description   TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  type          community_type NOT NULL DEFAULT 'user_created',
  join_policy   community_join_policy NOT NULL DEFAULT 'open',
  creator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.community_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'member',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_community_created
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_community();

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_select_authenticated" ON public.communities
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND is_active = TRUE
  );

CREATE POLICY "communities_insert" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "communities_update_creator" ON public.communities
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "community_members_select" ON public.community_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "community_members_insert_open" ON public.community_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id
        AND c.join_policy = 'open'
        AND c.is_active = TRUE
    )
  );

CREATE POLICY "community_members_delete_self" ON public.community_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_communities_creator ON public.communities (creator_id);
CREATE INDEX idx_communities_active ON public.communities (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_community_members_community ON public.community_members (community_id);
CREATE INDEX idx_community_members_user ON public.community_members (user_id);
