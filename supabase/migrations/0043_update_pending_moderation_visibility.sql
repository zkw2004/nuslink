CREATE OR REPLACE FUNCTION public.is_content_visible(
  outcome public.moderation_outcome
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT outcome IN ('allowed', 'pending', 'error');
$$;

GRANT EXECUTE ON FUNCTION public.is_content_visible(public.moderation_outcome)
  TO authenticated;
