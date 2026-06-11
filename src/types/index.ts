// Core domain types for NUSLink

export type Intent =
  | "study_group"
  | "hackathon"
  | "tutoring"
  | "internship_networking";

export type GroupType =
  | "study_group"
  | "hackathon_team"
  | "project_team"
  | "tutoring_session";

export type PrivacySetting = "public" | "semi_private" | "private";

export type SemiPrivateRestriction = "same_module" | "same_year" | "same_faculty";

export type BadgeTier = "bronze" | "silver" | "gold";

export type CommunityType = "official" | "user_created";

export type JoinPolicy = "open" | "request_approval";

export type UserRole = "member" | "co_admin" | "admin";

export interface UserProfile {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  faculty: string | null;
  major: string | null;
  year_of_study: number | null;
  graduation_date: string | null;
  is_sso_verified: boolean;
  intents: Intent[];
  interests: string[];
  skills: string[];
  badge_tier: BadgeTier | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  module_code: string | null;
  privacy: PrivacySetting;
  restriction: SemiPrivateRestriction | null;
  description: string | null;
  tags: string[];
  max_size: number | null;
  scheduled_time: string | null;
  venue: string | null;
  creator_id: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  join_policy: JoinPolicy;
  creator_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchBreakdown {
  schedule_overlap: number | null;
  target_grade: number | null;
}

export interface PeopleMatch {
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  faculty: string | null;
  major: string | null;
  year_of_study: number | null;
  badge_tier: BadgeTier | null;
  interests: string[];
  intents: string[];
  shared_modules: string[];
  compatibility_percentage: number;
  breakdown: {
    schedule_overlap: number | null;
    target_grade: number | null;
  };
  target_grade_summary: string;
  schedule_summary: string;
}

export interface PeopleMatchesResponse {
  semester: string;
  available_modules: string[];
  candidates: PeopleMatch[];
}
