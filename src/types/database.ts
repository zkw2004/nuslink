export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          badge_tier: "bronze" | "silver" | "gold" | null;
          bio: string;
          bio_moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          created_at: string;
          display_name: string;
          faculty: string | null;
          graduation_date: string | null;
          hall_residence: string | null;
          headline: string | null;
          headline_moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          id: string;
          intents: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests: string[];
          is_sso_verified: boolean;
          major: string | null;
          onboarding_completed: boolean;
          cca_tags: string[];
          preferred_group_size: number | null;
          project_tags: string[];
          skills: string[];
          study_mode: string | null;
          study_style: string | null;
          updated_at: string;
          year_of_study: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          badge_tier?: "bronze" | "silver" | "gold" | null;
          bio?: string;
          bio_moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          created_at?: string;
          display_name?: string;
          faculty?: string | null;
          graduation_date?: string | null;
          hall_residence?: string | null;
          headline?: string | null;
          headline_moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          id: string;
          intents?: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests?: string[];
          is_sso_verified?: boolean;
          major?: string | null;
          onboarding_completed?: boolean;
          cca_tags?: string[];
          preferred_group_size?: number | null;
          project_tags?: string[];
          skills?: string[];
          study_mode?: string | null;
          study_style?: string | null;
          updated_at?: string;
          year_of_study?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          badge_tier?: "bronze" | "silver" | "gold" | null;
          bio?: string;
          bio_moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          created_at?: string;
          display_name?: string;
          faculty?: string | null;
          graduation_date?: string | null;
          hall_residence?: string | null;
          headline?: string | null;
          headline_moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          id?: string;
          intents?: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests?: string[];
          is_sso_verified?: boolean;
          major?: string | null;
          onboarding_completed?: boolean;
          cca_tags?: string[];
          preferred_group_size?: number | null;
          project_tags?: string[];
          skills?: string[];
          study_mode?: string | null;
          study_style?: string | null;
          updated_at?: string;
          year_of_study?: number | null;
        };
        Relationships: [];
      };
      profile_links: {
        Row: {
          created_at: string;
          id: string;
          is_visible: boolean;
          label: "linkedin" | "github" | "portfolio" | "other";
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          label: "linkedin" | "github" | "portfolio" | "other";
          updated_at?: string;
          url: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          label?: "linkedin" | "github" | "portfolio" | "other";
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_entries: {
        Row: {
          category: "work" | "project" | "competition";
          created_at: string;
          date_label: string | null;
          description: string | null;
          id: string;
          is_visible: boolean;
          organization: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: "work" | "project" | "competition";
          created_at?: string;
          date_label?: string | null;
          description?: string | null;
          id?: string;
          is_visible?: boolean;
          organization?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: "work" | "project" | "competition";
          created_at?: string;
          date_label?: string | null;
          description?: string | null;
          id?: string;
          is_visible?: boolean;
          organization?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          code: string;
          department: string | null;
          faculty: string | null;
          name: string;
        };
        Insert: {
          code: string;
          department?: string | null;
          faculty?: string | null;
          name: string;
        };
        Update: {
          code?: string;
          department?: string | null;
          faculty?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      user_modules: {
        Row: {
          created_at: string;
          id: string;
          module_code: string;
          semester: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          module_code: string;
          semester: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          module_code?: string;
          semester?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      timetable_slots: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_minute: number;
          id: string;
          semester: string;
          source: "manual" | "nusmods";
          start_minute: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_minute: number;
          id?: string;
          semester: string;
          source?: "manual" | "nusmods";
          start_minute: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_minute?: number;
          id?: string;
          semester?: string;
          source?: "manual" | "nusmods";
          start_minute?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      connection_requests: {
        Row: {
          created_at: string;
          id: string;
          recipient_id: string;
          requester_id: string;
          responded_at: string | null;
          status: "pending" | "accepted" | "declined";
        };
        Insert: {
          created_at?: string;
          id?: string;
          recipient_id: string;
          requester_id: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Update: {
          created_at?: string;
          id?: string;
          recipient_id?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Relationships: [];
      };
      connections: {
        Row: {
          created_at: string;
          id: string;
          user_a_id: string;
          user_b_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_a_id: string;
          user_b_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_a_id?: string;
          user_b_id?: string;
        };
        Relationships: [];
      };
      direct_conversations: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_conversation_members: {
        Row: {
          archived_at: string | null;
          conversation_id: string;
          deleted_at: string | null;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          muted_at: string | null;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          conversation_id: string;
          deleted_at?: string | null;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          conversation_id?: string;
          deleted_at?: string | null;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          attachment_kind: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_url: string | null;
          body: string | null;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Insert: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Update: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id?: string;
        };
        Relationships: [];
      };
      chat_polls: {
        Row: {
          community_message_id: string | null;
          created_at: string;
          created_by: string;
          direct_message_id: string | null;
          group_message_id: string | null;
          id: string;
          question: string;
        };
        Insert: {
          community_message_id?: string | null;
          created_at?: string;
          created_by: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          question: string;
        };
        Update: {
          community_message_id?: string | null;
          created_at?: string;
          created_by?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          question?: string;
        };
        Relationships: [];
      };
      chat_meetups: {
        Row: {
          closed_at: string | null;
          closes_at: string;
          community_message_id: string | null;
          created_at: string;
          created_by: string;
          direct_message_id: string | null;
          group_message_id: string | null;
          id: string;
          status: "open" | "closed_confirmed" | "closed_tie";
          title: string;
          winning_label: string | null;
          winning_option_id: string | null;
        };
        Insert: {
          closed_at?: string | null;
          closes_at: string;
          community_message_id?: string | null;
          created_at?: string;
          created_by: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          status?: "open" | "closed_confirmed" | "closed_tie";
          title: string;
          winning_label?: string | null;
          winning_option_id?: string | null;
        };
        Update: {
          closed_at?: string | null;
          closes_at?: string;
          community_message_id?: string | null;
          created_at?: string;
          created_by?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          status?: "open" | "closed_confirmed" | "closed_tie";
          title?: string;
          winning_label?: string | null;
          winning_option_id?: string | null;
        };
        Relationships: [];
      };
      chat_meetup_options: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          meetup_id: string;
          position: number;
          source: "suggested" | "custom";
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          meetup_id: string;
          position: number;
          source?: "suggested" | "custom";
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          meetup_id?: string;
          position?: number;
          source?: "suggested" | "custom";
        };
        Relationships: [];
      };
      chat_meetup_votes: {
        Row: {
          created_at: string;
          id: string;
          meetup_id: string;
          option_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          meetup_id: string;
          option_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          meetup_id?: string;
          option_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_poll_options: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          poll_id: string;
          position: number;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          poll_id: string;
          position: number;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          poll_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      chat_poll_votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_pinned_messages: {
        Row: {
          community_message_id: string | null;
          created_at: string;
          direct_message_id: string | null;
          group_message_id: string | null;
          id: string;
          pinned_by: string;
        };
        Insert: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          pinned_by: string;
        };
        Update: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          pinned_by?: string;
        };
        Relationships: [];
      };
      chat_message_user_deletions: {
        Row: {
          community_message_id: string | null;
          created_at: string;
          direct_message_id: string | null;
          group_message_id: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          group_message_id?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          is_active: boolean;
          max_size: number | null;
          min_size: number | null;
          moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          module_code: string | null;
          name: string;
          privacy: "public" | "semi_private" | "private";
          review_min_membership_days: number;
          restriction: "same_module" | "same_year" | "same_faculty" | null;
          scheduled_time: string | null;
          semester: string;
          tags: string[];
          type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at: string;
          venue: string | null;
          invite_code: string | null;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_size?: number | null;
          min_size?: number | null;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          module_code?: string | null;
          name: string;
          privacy?: "public" | "semi_private" | "private";
          review_min_membership_days?: number;
          restriction?: "same_module" | "same_year" | "same_faculty" | null;
          scheduled_time?: string | null;
          semester: string;
          tags?: string[];
          type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at?: string;
          venue?: string | null;
          invite_code?: string | null;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_size?: number | null;
          min_size?: number | null;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          module_code?: string | null;
          name?: string;
          privacy?: "public" | "semi_private" | "private";
          review_min_membership_days?: number;
          restriction?: "same_module" | "same_year" | "same_faculty" | null;
          scheduled_time?: string | null;
          semester?: string;
          tags?: string[];
          type?: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at?: string;
          venue?: string | null;
          invite_code?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          archived_at: string | null;
          deleted_at: string | null;
          group_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          left_at: string | null;
          muted_at: string | null;
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          deleted_at?: string | null;
          group_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          muted_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          deleted_at?: string | null;
          group_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          muted_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id?: string;
        };
        Relationships: [];
      };
      badge_tier_rules: {
        Row: {
          created_at: string;
          min_average_score: number;
          min_review_count: number;
          priority: number;
          tier: "bronze" | "silver" | "gold";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          min_average_score: number;
          min_review_count: number;
          priority: number;
          tier: "bronze" | "silver" | "gold";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          min_average_score?: number;
          min_review_count?: number;
          priority?: number;
          tier?: "bronze" | "silver" | "gold";
          updated_at?: string;
        };
        Relationships: [];
      };
      group_reviews: {
        Row: {
          communication_score: number;
          contribution_score: number;
          created_at: string;
          group_id: string;
          id: string;
          reliability_score: number;
          reviewee_id: string;
          reviewer_id: string;
          updated_at: string;
          written_review: string | null;
        };
        Insert: {
          communication_score: number;
          contribution_score: number;
          created_at?: string;
          group_id: string;
          id?: string;
          reliability_score: number;
          reviewee_id: string;
          reviewer_id: string;
          updated_at?: string;
          written_review?: string | null;
        };
        Update: {
          communication_score?: number;
          contribution_score?: number;
          created_at?: string;
          group_id?: string;
          id?: string;
          reliability_score?: number;
          reviewee_id?: string;
          reviewer_id?: string;
          updated_at?: string;
          written_review?: string | null;
        };
        Relationships: [];
      };
      group_invitations: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          inviter_id: string;
          recipient_id: string;
          responded_at: string | null;
          status: "pending" | "accepted" | "declined";
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          inviter_id: string;
          recipient_id: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          inviter_id?: string;
          recipient_id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Relationships: [];
      };
      group_join_requests: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          responded_by: string | null;
          status: "pending" | "accepted" | "declined";
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          requester_id: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          requester_id?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: "pending" | "accepted" | "declined";
        };
        Relationships: [];
      };
      group_messages: {
        Row: {
          attachment_kind: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_url: string | null;
          body: string | null;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          group_id: string;
          id: string;
          moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Insert: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          group_id: string;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Update: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          group_id?: string;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id?: string;
        };
        Relationships: [];
      };
      communities: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string;
          id: string;
          is_active: boolean;
          join_policy: "open" | "request_approval";
          moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          name: string;
          tags: string[];
          type: "official" | "user_created";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          join_policy?: "open" | "request_approval";
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          name: string;
          tags?: string[];
          type?: "official" | "user_created";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          join_policy?: "open" | "request_approval";
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          name?: string;
          tags?: string[];
          type?: "official" | "user_created";
          updated_at?: string;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          archived_at: string | null;
          community_id: string;
          deleted_at: string | null;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          muted_at: string | null;
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          community_id: string;
          deleted_at?: string | null;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          community_id?: string;
          deleted_at?: string | null;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id?: string;
        };
        Relationships: [];
      };
      community_messages: {
        Row: {
          attachment_kind: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_url: string | null;
          body: string | null;
          community_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          moderation_outcome: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Insert: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          community_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id: string;
        };
        Update: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string | null;
          community_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          moderation_outcome?: "allowed" | "flagged" | "blocked" | "error";
          sender_id?: string;
        };
        Relationships: [];
      };
      shared_resources: {
        Row: {
          community_id: string | null;
          created_at: string;
          file_path: string;
          file_url: string;
          group_id: string | null;
          id: string;
          mime_type: string;
          name: string;
          owner_id: string;
          size_bytes: number;
        };
        Insert: {
          community_id?: string | null;
          created_at?: string;
          file_path: string;
          file_url: string;
          group_id?: string | null;
          id?: string;
          mime_type: string;
          name: string;
          owner_id: string;
          size_bytes: number;
        };
        Update: {
          community_id?: string | null;
          created_at?: string;
          file_path?: string;
          file_url?: string;
          group_id?: string | null;
          id?: string;
          mime_type?: string;
          name?: string;
          owner_id?: string;
          size_bytes?: number;
        };
        Relationships: [];
      };
      nudge_preferences: {
        Row: {
          behaviour_enabled: boolean;
          created_at: string;
          network_enabled: boolean;
          time_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          behaviour_enabled?: boolean;
          created_at?: string;
          network_enabled?: boolean;
          time_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          behaviour_enabled?: boolean;
          created_at?: string;
          network_enabled?: boolean;
          time_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          body: string;
          created_at: string;
          dedupe_key: string | null;
          group_id: string | null;
          href: string | null;
          id: string;
          metadata: Record<string, unknown>;
          read_at: string | null;
          recipient_id: string;
          title: string;
          type:
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
        };
        Insert: {
          actor_id?: string | null;
          body?: string;
          created_at?: string;
          dedupe_key?: string | null;
          group_id?: string | null;
          href?: string | null;
          id?: string;
          metadata?: Record<string, unknown>;
          read_at?: string | null;
          recipient_id: string;
          title: string;
          type:
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
        };
        Update: {
          actor_id?: string | null;
          body?: string;
          created_at?: string;
          dedupe_key?: string | null;
          group_id?: string | null;
          href?: string | null;
          id?: string;
          metadata?: Record<string, unknown>;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
          type?:
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
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_profile_import: {
        Args: {
          bio_input: string | null;
          cca_tags_input: string[] | null;
          entries_input: unknown[];
          interests_input: string[] | null;
          links_input: unknown[];
          skills_input: string[] | null;
        };
        Returns: void;
      };
      can_access_chat_poll: {
        Args: {
          poll_id_input: string;
        };
        Returns: boolean;
      };
      delete_direct_conversation_for_all: {
        Args: {
          conversation_id_input: string;
        };
        Returns: undefined;
      };
      create_community_chat_poll: {
        Args: {
          community_id_input: string;
          option_inputs: string[];
          question_input: string;
        };
        Returns: string;
      };
      create_direct_chat_poll: {
        Args: {
          conversation_id_input: string;
          option_inputs: string[];
          question_input: string;
        };
        Returns: string;
      };
      create_group_chat_poll: {
        Args: {
          group_id_input: string;
          option_inputs: string[];
          question_input: string;
        };
        Returns: string;
      };
      create_group: {
        Args: {
          module_code_input: string;
          module_name_input: string;
          module_department_input: string | null;
          module_faculty_input: string | null;
          group_name_input: string;
          group_type_input: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          privacy_input: "public" | "semi_private" | "private";
          restriction_input: "same_module" | "same_year" | "same_faculty" | null;
          semester_input: string;
          description_input: string;
          min_size_input: number | null;
          max_size_input: number | null;
          venue_input: string;
        };
        Returns: {
          group_id: string;
          invite_code: string | null;
        }[];
      };
      create_public_group: {
        Args: {
          module_code_input: string;
          module_name_input: string;
          module_department_input: string | null;
          module_faculty_input: string | null;
          group_name_input: string;
          group_type_input: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
        };
        Returns: string;
      };
      create_connection_request: {
        Args: {
          recipient_id_input: string;
        };
        Returns: string;
      };
      cancel_connection_request: {
        Args: {
          recipient_id_input: string;
        };
        Returns: undefined;
      };
      create_group_invitation: {
        Args: {
          group_id_input: string;
          recipient_id_input: string;
        };
        Returns: string;
      };
      create_group_join_request: {
        Args: {
          group_id_input: string;
        };
        Returns: string;
      };
      get_or_create_direct_conversation: {
        Args: {
          other_user_id_input: string;
        };
        Returns: string;
      };
      get_discover_groups: {
        Args: {
          semester_input: string;
        };
        Returns: {
          id: string;
          name: string;
          type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          module_code: string | null;
          description: string | null;
          creator_id: string;
          privacy: "public" | "semi_private" | "private";
          restriction: "same_module" | "same_year" | "same_faculty" | null;
          semester: string;
          joined: boolean;
          can_join: boolean;
          request_pending: boolean;
          join_note: string;
          invite_code: string | null;
        }[];
      };
      get_group_review_eligibility: {
        Args: {
          group_id_input: string;
          reviewee_id_input: string;
        };
        Returns: {
          eligible_at: string | null;
          is_eligible: boolean;
          reason: string;
          required_days: number | null;
          reviewee_joined_at: string | null;
          reviewer_joined_at: string | null;
        }[];
      };
      get_group_reviewable_members: {
        Args: {
          group_id_input: string;
        };
        Returns: {
          avatar_url: string | null;
          badge_tier: "bronze" | "silver" | "gold" | null;
          display_name: string;
          id: string;
          role: "member" | "co_admin" | "admin";
        }[];
      };
      get_profile_review_summary: {
        Args: {
          profile_id_input: string;
        };
        Returns: {
          badge_tier: "bronze" | "silver" | "gold" | null;
          communication_average: number | null;
          contribution_average: number | null;
          overall_average: number | null;
          received_review_count: number;
          reliability_average: number | null;
          reviewee_id: string;
          written_review_count: number;
        }[];
      };
      join_group_with_invite: {
        Args: {
          invite_code_input: string;
        };
        Returns: string;
      };
      join_visible_group: {
        Args: {
          group_id_input: string;
        };
        Returns: void;
      };
      leave_group: {
        Args: {
          group_id_input: string;
        };
        Returns: void;
      };
      list_profile_reviews: {
        Args: {
          limit_input?: number | null;
          offset_input?: number | null;
          profile_id_input: string;
        };
        Returns: {
          created_at: string;
          group_id: string;
          group_name: string;
          group_type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          id: string;
          reviewee_id: string;
          reviewer_avatar_url: string | null;
          reviewer_display_name: string;
          reviewer_id: string;
          updated_at: string;
          written_review: string;
        }[];
      };
      pin_community_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      pin_direct_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      pin_group_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      respond_to_connection_request: {
        Args: {
          decision_input: string;
          request_id_input: string;
        };
        Returns: void;
      };
      respond_to_group_invitation: {
        Args: {
          decision_input: string;
          invitation_id_input: string;
        };
        Returns: void;
      };
      respond_to_group_join_request: {
        Args: {
          decision_input: string;
          request_id_input: string;
        };
        Returns: void;
      };
      search_interest_tags: {
        Args: {
          search_input: string;
        };
        Returns: {
          tag: string;
        }[];
      };
      send_direct_message: {
        Args: {
          attachment_kind_input?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type_input?: string | null;
          attachment_name_input?: string | null;
          attachment_size_input?: number | null;
          attachment_url_input?: string | null;
          body_input?: string | null;
          conversation_id_input: string;
        };
        Returns: string;
      };
      submit_group_review: {
        Args: {
          communication_input: number;
          contribution_input: number;
          group_id_input: string;
          reliability_input: number;
          reviewee_id_input: string;
          written_review_input?: string | null;
        };
        Returns: string;
      };
      unpin_community_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      unpin_direct_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      unpin_group_chat_message: {
        Args: {
          message_id_input: string;
        };
        Returns: void;
      };
      unvote_chat_poll: {
        Args: {
          poll_id_input: string;
        };
        Returns: void;
      };
      upsert_user_module: {
        Args: {
          module_code_input: string;
          module_department_input: string | null;
          module_faculty_input: string | null;
          module_name_input: string;
          semester_input: string;
        };
        Returns: void;
      };
      vote_chat_poll: {
        Args: {
          option_id_input: string;
          poll_id_input: string;
        };
        Returns: void;
      };
    };
    Enums: {
      badge_tier: "bronze" | "silver" | "gold";
      connection_request_status: "pending" | "accepted" | "declined";
      group_invitation_status: "pending" | "accepted" | "declined";
      group_join_request_status: "pending" | "accepted" | "declined";
      intent: "study_group" | "hackathon" | "tutoring" | "internship_networking";
      group_type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
      privacy_setting: "public" | "semi_private" | "private";
      semi_private_restriction: "same_module" | "same_year" | "same_faculty";
      user_role: "member" | "co_admin" | "admin";
      community_join_policy: "open" | "request_approval";
      community_type: "official" | "user_created";
      notification_type:
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
    };
  };
};
