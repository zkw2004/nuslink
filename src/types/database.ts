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
          skills: string[];
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
          skills?: string[];
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
          skills?: string[];
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
          target_grade: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          module_code: string;
          semester: string;
          target_grade?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          module_code?: string;
          semester?: string;
          target_grade?: string | null;
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
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          id?: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
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
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          role?: "member" | "co_admin" | "admin";
          user_id?: string;
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
          role: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Insert: {
          community_id: string;
          id?: string;
          joined_at?: string;
          role?: "member" | "co_admin" | "admin";
          user_id: string;
        };
        Update: {
          community_id?: string;
          id?: string;
          joined_at?: string;
          role?: "member" | "co_admin" | "admin";
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
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
      respond_to_connection_request: {
        Args: {
          decision_input: string;
          request_id_input: string;
        };
        Returns: void;
      };
      send_direct_message: {
        Args: {
          body_input: string;
          conversation_id_input: string;
        };
        Returns: string;
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
