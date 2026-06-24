-- Extend DM attachments to include audio/video and align community chat with
-- the same attachment support.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  TRUE,
  15728640,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'application/octet-stream',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_content_check;

ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_attachment_kind_check;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_attachment_kind_check CHECK (
    attachment_kind IS NULL OR attachment_kind IN ('image', 'file', 'audio', 'video')
  );

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_check CHECK (
    (
      body IS NOT NULL
      AND char_length(trim(body)) > 0
      AND char_length(body) <= 2000
    )
    OR attachment_url IS NOT NULL
  );

DROP FUNCTION IF EXISTS public.send_direct_message(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
);

CREATE OR REPLACE FUNCTION public.send_direct_message(
  conversation_id_input UUID,
  body_input TEXT DEFAULT NULL,
  attachment_url_input TEXT DEFAULT NULL,
  attachment_name_input TEXT DEFAULT NULL,
  attachment_mime_type_input TEXT DEFAULT NULL,
  attachment_size_input INTEGER DEFAULT NULL,
  attachment_kind_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_message_id UUID;
  trimmed_body TEXT := NULLIF(trim(COALESCE(body_input, '')), '');
  normalized_attachment_url TEXT := NULLIF(trim(COALESCE(attachment_url_input, '')), '');
  normalized_attachment_kind TEXT := NULLIF(trim(COALESCE(attachment_kind_input, '')), '');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF conversation_id_input IS NULL THEN
    RAISE EXCEPTION 'Conversation is required';
  END IF;

  IF trimmed_body IS NULL AND normalized_attachment_url IS NULL THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF trimmed_body IS NOT NULL AND char_length(trimmed_body) > 2000 THEN
    RAISE EXCEPTION 'Message is too long';
  END IF;

  IF normalized_attachment_url IS NOT NULL
     AND normalized_attachment_kind NOT IN ('image', 'file', 'audio', 'video') THEN
    RAISE EXCEPTION 'Unsupported attachment type';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.direct_conversation_members member
    WHERE member.conversation_id = conversation_id_input
      AND member.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  INSERT INTO public.direct_messages (
    conversation_id,
    sender_id,
    body,
    attachment_url,
    attachment_name,
    attachment_mime_type,
    attachment_size,
    attachment_kind
  )
  VALUES (
    conversation_id_input,
    current_user_id,
    trimmed_body,
    normalized_attachment_url,
    NULLIF(trim(COALESCE(attachment_name_input, '')), ''),
    NULLIF(trim(COALESCE(attachment_mime_type_input, '')), ''),
    attachment_size_input,
    normalized_attachment_kind
  )
  RETURNING id INTO created_message_id;

  UPDATE public.direct_conversations
  SET updated_at = NOW()
  WHERE id = conversation_id_input;

  RETURN created_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_direct_message(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT
) TO authenticated;

ALTER TABLE public.community_messages
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_kind TEXT CHECK (
    attachment_kind IS NULL OR attachment_kind IN ('image', 'file', 'audio', 'video')
  );

ALTER TABLE public.community_messages
  DROP CONSTRAINT IF EXISTS community_messages_body_check;

ALTER TABLE public.community_messages
  ADD CONSTRAINT community_messages_content_check CHECK (
    (
      body IS NOT NULL
      AND char_length(trim(body)) > 0
      AND char_length(body) <= 2000
    )
    OR attachment_url IS NOT NULL
  );
