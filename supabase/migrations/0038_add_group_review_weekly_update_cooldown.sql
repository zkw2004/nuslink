CREATE OR REPLACE FUNCTION public.is_group_review_eligible(
  group_id_input UUID,
  reviewer_id_input UUID,
  reviewee_id_input UUID,
  at_time_input TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  is_eligible BOOLEAN,
  reason TEXT,
  required_days SMALLINT,
  reviewer_joined_at TIMESTAMPTZ,
  reviewee_joined_at TIMESTAMPTZ,
  eligible_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups%ROWTYPE;
  reviewer_membership public.group_members%ROWTYPE;
  reviewee_membership public.group_members%ROWTYPE;
  existing_review public.group_reviews%ROWTYPE;
  shared_start TIMESTAMPTZ;
  shared_end TIMESTAMPTZ;
  threshold_at TIMESTAMPTZ;
  review_update_at TIMESTAMPTZ;
BEGIN
  IF reviewer_id_input IS NULL OR reviewee_id_input IS NULL OR group_id_input IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Missing required ids', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF reviewer_id_input = reviewee_id_input THEN
    RETURN QUERY SELECT FALSE, 'You cannot review yourself', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE id = group_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Group not found', NULL::SMALLINT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO reviewer_membership
  FROM public.group_members
  WHERE group_id = group_id_input
    AND user_id = reviewer_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reviewer has no membership in this group', target_group.review_min_membership_days, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO reviewee_membership
  FROM public.group_members
  WHERE group_id = group_id_input
    AND user_id = reviewee_id_input;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reviewee has no membership in this group', target_group.review_min_membership_days, reviewer_membership.joined_at, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  shared_start := GREATEST(reviewer_membership.joined_at, reviewee_membership.joined_at);
  shared_end := LEAST(
    COALESCE(reviewer_membership.left_at, at_time_input),
    COALESCE(reviewee_membership.left_at, at_time_input),
    at_time_input
  );
  threshold_at := shared_start + make_interval(days => target_group.review_min_membership_days);

  IF shared_end < threshold_at THEN
    RETURN QUERY
      SELECT
        FALSE,
        'Not enough shared membership time yet',
        target_group.review_min_membership_days,
        reviewer_membership.joined_at,
        reviewee_membership.joined_at,
        threshold_at;
    RETURN;
  END IF;

  SELECT * INTO existing_review
  FROM public.group_reviews
  WHERE group_id = group_id_input
    AND reviewer_id = reviewer_id_input
    AND reviewee_id = reviewee_id_input;

  IF FOUND THEN
    review_update_at := existing_review.updated_at + INTERVAL '7 days';

    IF at_time_input < review_update_at THEN
      RETURN QUERY
        SELECT
          FALSE,
          'Review updated recently',
          target_group.review_min_membership_days,
          reviewer_membership.joined_at,
          reviewee_membership.joined_at,
          review_update_at;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
    SELECT
      TRUE,
      'Eligible to review',
      target_group.review_min_membership_days,
      reviewer_membership.joined_at,
      reviewee_membership.joined_at,
      threshold_at;
END;
$$;
