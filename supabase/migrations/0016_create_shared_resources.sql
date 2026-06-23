-- Milestone 2 shared resources for groups and communities.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-resources',
  'shared-resources',
  TRUE,
  15728640,
  ARRAY[
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "shared_resources_bucket_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'shared-resources');

CREATE POLICY "shared_resources_bucket_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shared-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "shared_resources_bucket_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'shared-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE TABLE public.shared_resources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id       UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  community_id   UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  name           TEXT NOT NULL CHECK (
    char_length(trim(name)) > 0
    AND char_length(name) <= 120
  ),
  file_url       TEXT NOT NULL,
  file_path      TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  size_bytes     INTEGER NOT NULL CHECK (size_bytes > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shared_resources_scope_check CHECK (
    (
      group_id IS NOT NULL
      AND community_id IS NULL
    )
    OR (
      group_id IS NULL
      AND community_id IS NOT NULL
    )
  )
);

ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_resources_select_relevant_members" ON public.shared_resources
  FOR SELECT USING (
    (
      community_id IS NOT NULL
      AND public.is_community_member(community_id)
    )
    OR (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.group_members member
        WHERE member.group_id = shared_resources.group_id
          AND member.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "shared_resources_insert_relevant_members" ON public.shared_resources
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND (
      (
        community_id IS NOT NULL
        AND public.is_community_member(community_id)
      )
      OR (
        group_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.group_members member
          WHERE member.group_id = shared_resources.group_id
            AND member.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "shared_resources_delete_owner" ON public.shared_resources
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_shared_resources_community_created_at
  ON public.shared_resources (community_id, created_at DESC)
  WHERE community_id IS NOT NULL;

CREATE INDEX idx_shared_resources_group_created_at
  ON public.shared_resources (group_id, created_at DESC)
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_shared_resources_owner_created_at
  ON public.shared_resources (owner_id, created_at DESC);
