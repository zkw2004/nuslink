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
          tags: string[];
          type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at: string;
          venue: string | null;
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
          tags?: string[];
          type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at?: string;
          venue?: string | null;
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
          tags?: string[];
          type?: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
          updated_at?: string;
          venue?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: {
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
      intent: "study_group" | "hackathon" | "tutoring" | "internship_networking";
      group_type: "study_group" | "hackathon_team" | "project_team" | "tutoring_session";
      privacy_setting: "public" | "semi_private" | "private";
      semi_private_restriction: "same_module" | "same_year" | "same_faculty";
      user_role: "member" | "co_admin" | "admin";
    };
  };
};
