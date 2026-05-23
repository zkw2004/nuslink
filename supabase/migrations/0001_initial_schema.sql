-- NUSLink — Initial Schema
-- Run after Joel creates the Supabase project:
--   supabase db push   (or paste into the Supabase SQL editor)
--
-- Depends on: auth.users (provided by Supabase Auth automatically)

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE intent AS ENUM (
  'study_group',
  'hackathon',
  'tutoring',
  'internship_networking'
);

CREATE TYPE group_type AS ENUM (
  'study_group',
  'hackathon_team',
  'project_team',
  'tutoring_session'
);

CREATE TYPE privacy_setting AS ENUM (
  'public',
  'semi_private',
  'private'
);

CREATE TYPE semi_private_restriction AS ENUM (
  'same_module',
  'same_year',
  'same_faculty'
);

CREATE TYPE user_role AS ENUM (
  'member',
  'co_admin',
  'admin'
);

CREATE TYPE badge_tier AS ENUM (
  'bronze',
  'silver',
  'gold'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Extends auth.users 1-to-1. Created automatically on sign-up via trigger.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL DEFAULT '',
  bio              TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 200),
  avatar_url       TEXT,
  faculty          TEXT,
  major            TEXT,
  year_of_study    SMALLINT CHECK (year_of_study BETWEEN 1 AND 6),
  graduation_date  DATE,
  is_sso_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  intents          intent[]     NOT NULL DEFAULT '{}',
  interests        TEXT[]       NOT NULL DEFAULT '{}',
  skills           TEXT[]       NOT NULL DEFAULT '{}',
  badge_tier       badge_tier,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULES
-- Static reference table populated from NUSMods API (one-time seed).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.modules (
  code        TEXT PRIMARY KEY,   -- e.g. 'CS2040S'
  name        TEXT NOT NULL,      -- e.g. 'Data Structures and Algorithms'
  department  TEXT,
  faculty     TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER MODULES
-- Which modules a user is taking this semester.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.user_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_code  TEXT NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
  semester     TEXT NOT NULL,         -- e.g. 'AY2526S1'
  target_grade TEXT,                  -- e.g. 'A+', 'B', NULL if not set
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_code, semester)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (char_length(name) <= 50),
  type          group_type NOT NULL,
  module_code   TEXT REFERENCES public.modules(code) ON DELETE SET NULL,
  privacy       privacy_setting NOT NULL DEFAULT 'public',
  restriction   semi_private_restriction,  -- only set when privacy = 'semi_private'
  description   TEXT CHECK (char_length(description) <= 500),
  tags          TEXT[]    NOT NULL DEFAULT '{}',
  min_size      SMALLINT  CHECK (min_size >= 2),
  max_size      SMALLINT  CHECK (max_size >= 2),
  scheduled_time TIMESTAMPTZ,
  venue         TEXT,
  creator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (min_size IS NULL OR max_size IS NULL OR min_size <= max_size)
);

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Creator is automatically added as admin when a group is created
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members  ENABLE ROW LEVEL SECURITY;

-- profiles: users can read all profiles, only update their own
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- modules: public read, no write from clients
CREATE POLICY "modules_select" ON public.modules
  FOR SELECT USING (TRUE);

-- user_modules: read own, write own
CREATE POLICY "user_modules_select" ON public.user_modules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_modules_insert" ON public.user_modules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_modules_delete" ON public.user_modules
  FOR DELETE USING (auth.uid() = user_id);

-- groups: public/semi-private visible to all authenticated users; private shown with limited info
CREATE POLICY "groups_select_public" ON public.groups
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND is_active = TRUE
  );

-- groups: only verified users can create (SSO check handled at app layer for now)
CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- groups: only admin/co-admin can update (enforced at app layer via group_members check)
CREATE POLICY "groups_update_creator" ON public.groups
  FOR UPDATE USING (auth.uid() = creator_id);

-- group_members: members can see their own membership; admins can see all
CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_insert" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_delete" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_user_modules_user   ON public.user_modules (user_id);
CREATE INDEX idx_user_modules_module ON public.user_modules (module_code);
CREATE INDEX idx_groups_module       ON public.groups (module_code);
CREATE INDEX idx_groups_creator      ON public.groups (creator_id);
CREATE INDEX idx_groups_privacy      ON public.groups (privacy) WHERE is_active = TRUE;
CREATE INDEX idx_group_members_group ON public.group_members (group_id);
CREATE INDEX idx_group_members_user  ON public.group_members (user_id);
