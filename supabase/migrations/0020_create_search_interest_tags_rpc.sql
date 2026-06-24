-- Matching redesign: suggest existing interest tags from stored profile data.

CREATE OR REPLACE FUNCTION public.search_interest_tags(search_input TEXT)
RETURNS TABLE (tag TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ranked.tag
  FROM (
    SELECT
      candidate.tag,
      CASE
        WHEN lower(candidate.tag) = lower(trim(search_input)) THEN 0
        WHEN lower(candidate.tag) LIKE lower(trim(search_input)) || '%' THEN 1
        ELSE 2
      END AS match_rank,
      char_length(candidate.tag) AS tag_length,
      lower(candidate.tag) AS normalized_tag
    FROM (
      SELECT trim(unnest(profiles.interests)) AS tag
      FROM public.profiles
      WHERE array_length(profiles.interests, 1) IS NOT NULL
    ) AS candidate
    WHERE candidate.tag <> ''
      AND (
        lower(candidate.tag) LIKE '%' || lower(trim(search_input)) || '%'
        OR lower(trim(search_input)) LIKE '%' || lower(candidate.tag) || '%'
      )
    GROUP BY candidate.tag
  ) AS ranked
  ORDER BY
    ranked.match_rank,
    ranked.tag_length,
    ranked.normalized_tag
  LIMIT 8;
$$;

REVOKE ALL ON FUNCTION public.search_interest_tags(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_interest_tags(TEXT) TO authenticated;
