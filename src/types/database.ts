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
    };
    Views: Record<string, never>;
    Functions: {
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
    };
  };
};
