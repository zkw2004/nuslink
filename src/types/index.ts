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
export type ChatAttachmentKind = "image" | "file" | "audio" | "video";

export type UserRole = "member" | "co_admin" | "admin";
export type TimetableSource = "manual" | "nusmods";
export type ConnectionRequestStatus = "pending" | "accepted" | "declined";
export type ConnectionRelationshipStatus =
  | "none"
  | "incoming_request"
  | "outgoing_request"
  | "connected";

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
  tags: string[];
  creator_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimetableSlot {
  id?: string;
  user_id?: string;
  semester?: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  source: TimetableSource;
}

export interface TimetableClassSlot {
  module_code: string;
  lesson_type: string;
  class_no: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
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

export interface ConnectionPreviewProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  major: string | null;
  year_of_study: number | null;
  badge_tier: BadgeTier | null;
}

export interface IncomingConnectionRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionRequestStatus;
  created_at: string;
  requester_profile: ConnectionPreviewProfile;
}

export interface ConnectedProfilePreview {
  id: string;
  display_name: string;
  avatar_url: string | null;
  major: string | null;
  year_of_study: number | null;
  badge_tier: BadgeTier | null;
}

export interface DirectConversationSummary {
  id: string;
  other_user: ConnectedProfilePreview;
  last_message_preview: string | null;
  last_message_at: string | null;
  updated_at: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  attachment_kind: ChatAttachmentKind | null;
  created_at: string;
}

export interface DirectMessageAttachmentInput {
  url: string;
  name: string;
  mime_type: string;
  size: number | null;
  kind: ChatAttachmentKind;
}

export type ChatKind = "direct" | "community";

export interface ChatPollOption {
  id: string;
  poll_id: string;
  body: string;
  position: number;
  vote_count: number;
  is_selected_by_current_user: boolean;
}

export interface ChatPoll {
  id: string;
  message_id: string;
  question: string;
  created_by: string;
  created_at: string;
  options: ChatPollOption[];
  total_votes: number;
}

export interface ChatPinnedMessage {
  id: string;
  message_id: string;
  pinned_by: string;
  created_at: string;
}

export interface CommunityChatSummary {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  join_policy: JoinPolicy;
  tags: string[];
  creator_id: string;
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface CommunityChatMessage {
  id: string;
  community_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  attachment_kind: ChatAttachmentKind | null;
  created_at: string;
  sender_profile: ConnectedProfilePreview;
}

export interface SharedResource {
  id: string;
  owner_id: string;
  group_id: string | null;
  community_id: string | null;
  name: string;
  file_url: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}
