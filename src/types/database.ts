export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          badge_tier: "bronze" | "silver" | "gold" | null;
          bio: string;
          created_at: string;
          display_name: string;
          faculty: string | null;
          graduation_date: string | null;
          id: string;
          intents: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests: string[];
          is_sso_verified: boolean;
          major: string | null;
          onboarding_completed: boolean;
          preferred_group_size: number | null;
          skills: string[];
          study_style: string | null;
          updated_at: string;
          year_of_study: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          badge_tier?: "bronze" | "silver" | "gold" | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          faculty?: string | null;
          graduation_date?: string | null;
          id: string;
          intents?: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests?: string[];
          is_sso_verified?: boolean;
          major?: string | null;
          onboarding_completed?: boolean;
          preferred_group_size?: number | null;
          skills?: string[];
          study_style?: string | null;
          updated_at?: string;
          year_of_study?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          badge_tier?: "bronze" | "silver" | "gold" | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          faculty?: string | null;
          graduation_date?: string | null;
          id?: string;
          intents?: ("study_group" | "hackathon" | "tutoring" | "internship_networking")[];
          interests?: string[];
          is_sso_verified?: boolean;
          major?: string | null;
          onboarding_completed?: boolean;
          preferred_group_size?: number | null;
          skills?: string[];
          study_style?: string | null;
          updated_at?: string;
          year_of_study?: number | null;
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
          conversation_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
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
          id: string;
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
          id?: string;
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
          id?: string;
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
          id: string;
          question: string;
        };
        Insert: {
          community_message_id?: string | null;
          created_at?: string;
          created_by: string;
          direct_message_id?: string | null;
          id?: string;
          question: string;
        };
        Update: {
          community_message_id?: string | null;
          created_at?: string;
          created_by?: string;
          direct_message_id?: string | null;
          id?: string;
          question?: string;
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
          body?: string;
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
          id: string;
          pinned_by: string;
        };
        Insert: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          id?: string;
          pinned_by: string;
        };
        Update: {
          community_message_id?: string | null;
          created_at?: string;
          direct_message_id?: string | null;
          id?: string;
          pinned_by?: string;
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
          module_code: string | null;
          name: string;
          privacy: "public" | "semi_private" | "private";
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
          module_code?: string | null;
          name: string;
          privacy?: "public" | "semi_private" | "private";
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
          module_code?: string | null;
          name?: string;
          privacy?: "public" | "semi_private" | "private";
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
          group_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id?: string;
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
          group_id: string;
          id: string;
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
          group_id: string;
          id?: string;
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
          group_id?: string;
          id?: string;
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
          name?: string;
          tags?: string[];
          type?: "official" | "user_created";
          updated_at?: string;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          community_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          community_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          community_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
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
          id: string;
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
          id?: string;
          sender_id: string;
        };
        Update: {
          attachment_kind?: "image" | "file" | "audio" | "video" | null;
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          body?: string;
          community_id?: string;
          created_at?: string;
          id?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      can_access_chat_poll: {
        Args: {
          poll_id_input: string;
        };
        Returns: boolean;
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
          join_note: string;
          invite_code: string | null;
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
      respond_to_connection_request: {
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
      intent: "study_group" | "hackathon" | "tutoring" | "internship_networking";
      group_type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
      privacy_setting: "public" | "semi_private" | "private";
      semi_private_restriction: "same_module" | "same_year" | "same_faculty";
      user_role: "member" | "co_admin" | "admin";
      community_join_policy: "open" | "request_approval";
      community_type: "official" | "user_created";
    };
  };
};
