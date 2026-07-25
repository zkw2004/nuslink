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
export type StudyStyle = "online" | "in_person" | "flexible";
export type StudyMode = StudyStyle;
export type ChatAttachmentKind = "image" | "file" | "audio" | "video";

export type UserRole = "member" | "co_admin" | "admin";
export type TimetableSource = "manual" | "nusmods";
export type ConnectionRequestStatus = "pending" | "accepted" | "declined";
export type MatchFeedbackEventType = "view" | "skip" | "accept" | "chat_start";
export type ProfileEntryCategory = "work" | "project" | "competition";
export type ProfileLinkLabel = "linkedin" | "github" | "portfolio" | "other";
export type GroupReviewEligibilityReason =
  | "Eligible to review"
  | "Group not found"
  | "Missing required ids"
  | "Not enough shared membership time yet"
  | "Review updated recently"
  | "Reviewee has no membership in this group"
  | "Reviewer has no membership in this group"
  | "You cannot review yourself";
export type ConnectionRelationshipStatus =
  | "none"
  | "incoming_request"
  | "outgoing_request"
  | "connected";
export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "connection_milestone"
  | "high_match"
  | "group_invite_received"
  | "group_join_requested"
  | "group_join_accepted"
  | "group_member_joined"
  | "resource_shared"
  | "system_announcement"
  | "nudge_time"
  | "nudge_behaviour"
  | "nudge_network";

export interface NudgePreferences {
  time_enabled: boolean;
  behaviour_enabled: boolean;
  network_enabled: boolean;
}

export interface UserProfile {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string;
  avatar_url: string | null;
  faculty: string | null;
  major: string | null;
  year_of_study: number | null;
  graduation_date: string | null;
  hall_residence: string | null;
  study_mode: StudyMode | null;
  study_style: StudyStyle | null;
  preferred_group_size: number | null;
  is_sso_verified: boolean;
  intents: Intent[];
  interests: string[];
  cca_tags: string[];
  skills: string[];
  badge_tier: BadgeTier | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileLink {
  id: string;
  user_id: string;
  label: ProfileLinkLabel;
  url: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileEntry {
  id: string;
  user_id: string;
  category: ProfileEntryCategory;
  title: string;
  organization: string | null;
  date_label: string | null;
  description: string | null;
  is_visible: boolean;
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
  review_min_membership_days?: number;
  scheduled_time: string | null;
  venue: string | null;
  creator_id: string;
  created_at: string;
}

export interface BadgeTierRule {
  tier: BadgeTier;
  min_review_count: number;
  min_average_score: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface GroupReview {
  id: string;
  group_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reliability_score: number;
  communication_score: number;
  contribution_score: number;
  written_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupReviewInput {
  group_id: string;
  reviewee_id: string;
  reliability_score: number;
  communication_score: number;
  contribution_score: number;
  written_review?: string | null;
}

export interface GroupReviewEligibility {
  is_eligible: boolean;
  reason: GroupReviewEligibilityReason;
  required_days: number | null;
  reviewer_joined_at: string | null;
  reviewee_joined_at: string | null;
  eligible_at: string | null;
}

export type GroupReviewEligibilityStatus =
  | "loading"
  | "eligible"
  | "notYet"
  | "reviewed"
  | "error";

export interface ReviewableGroupMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  badge_tier: BadgeTier | null;
}

export interface ReviewComposerTarget {
  group_id: string;
  group_name: string;
  reviewee: ReviewableGroupMember;
}

export interface PublicProfileReview {
  id: string;
  group_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_display_name: string;
  reviewer_avatar_url: string | null;
  group_name: string;
  group_type: GroupType;
  written_review: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileReviewSummary {
  reviewee_id: string;
  received_review_count: number;
  written_review_count: number;
  reliability_average: number | null;
  communication_average: number | null;
  contribution_average: number | null;
  overall_average: number | null;
  badge_tier: BadgeTier | null;
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
  same_intent: number | null;
  module_overlap: number | null;
  shared_skills: number | null;
  schedule_overlap: number | null;
  same_major: number | null;
  year_proximity: number | null;
  same_faculty: number | null;
  same_hall_or_residence: number | null;
  interest_overlap: number | null;
  study_mode: number | null;
  preferred_group_size: number | null;
  cca_tag_overlap: number | null;
  mutual_connections: number | null;
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
  hall_residence: string | null;
  interests: string[];
  cca_tags: string[];
  skills: string[];
  intents: string[];
  shared_modules: string[];
  compatibility_percentage: number;
  breakdown: MatchBreakdown;
  top_signals: string[];
  match_reasons: string[];
  schedule_summary: string;
}

export interface PeopleMatchesResponse {
  semester: string;
  available_modules: string[];
  candidates: PeopleMatch[];
}

export interface MatchFeedbackEventInput {
  target_user_id: string;
  event_type: MatchFeedbackEventType;
  semester?: string | null;
  module_code?: string | null;
  compatibility_percentage?: number | null;
  top_signals?: string[];
  shared_modules?: string[];
  metadata?: Record<string, unknown>;
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
  unread_count: number;
  archived_at: string | null;
  deleted_at: string | null;
  muted_at: string | null;
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
  deleted_at: string | null;
  edited_at: string | null;
}

export interface DirectMessageAttachmentInput {
  url: string;
  name: string;
  mime_type: string;
  size: number | null;
  kind: ChatAttachmentKind;
}

export type ChatKind = "direct" | "community" | "group";
export type MeetupStatus = "open" | "closed_confirmed" | "closed_tie";

export interface MeetupSuggestionCoverage {
  total_participants: number;
  included_participants: number;
  excluded_participants: number;
  available_participants: number;
}

export interface MeetupSuggestion {
  id: string;
  label: string;
  sub: string;
  suggestion_date: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  coverage: MeetupSuggestionCoverage;
}

export interface ChatMeetupOption {
  id: string;
  meetup_id: string;
  label: string;
  position: number;
  source: "suggested" | "custom";
  vote_count: number;
  is_selected_by_current_user: boolean;
  is_winner: boolean;
}

export interface ChatMeetup {
  id: string;
  message_id: string;
  title: string;
  created_by: string;
  created_at: string;
  closes_at: string;
  closed_at: string | null;
  status: MeetupStatus;
  winning_option_id: string | null;
  winning_label: string | null;
  total_votes: number;
  options: ChatMeetupOption[];
}

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
  created_at: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  archived_at: string | null;
  deleted_at: string | null;
  muted_at: string | null;
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
  deleted_at: string | null;
  edited_at: string | null;
  sender_profile: ConnectedProfilePreview;
}

export interface GroupChatSummary {
  id: string;
  name: string;
  type: GroupType;
  module_code: string | null;
  privacy: PrivacySetting;
  semester: string;
  created_at: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  archived_at: string | null;
  deleted_at: string | null;
  muted_at: string | null;
}

export interface GroupChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  attachment_kind: ChatAttachmentKind | null;
  created_at: string;
  deleted_at: string | null;
  edited_at: string | null;
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

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  group_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
