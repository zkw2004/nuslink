export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          bio: string;
          avatar_url: string | null;
          faculty: string | null;
          major: string | null;
          year_of_study: number | null;
          graduation_date: string | null;
          is_sso_verified: boolean;
          intents: Database["public"]["Enums"]["intent"][];
          interests: string[];
          skills: string[];
          badge_tier: Database["public"]["Enums"]["badge_tier"] | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string | null;
          faculty?: string | null;
          major?: string | null;
          year_of_study?: number | null;
          graduation_date?: string | null;
          is_sso_verified?: boolean;
          intents?: Database["public"]["Enums"]["intent"][];
          interests?: string[];
          skills?: string[];
          badge_tier?: Database["public"]["Enums"]["badge_tier"] | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string | null;
          faculty?: string | null;
          major?: string | null;
          year_of_study?: number | null;
          graduation_date?: string | null;
          is_sso_verified?: boolean;
          intents?: Database["public"]["Enums"]["intent"][];
          interests?: string[];
          skills?: string[];
          badge_tier?: Database["public"]["Enums"]["badge_tier"] | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      intent:
        | "study_group"
        | "hackathon"
        | "tutoring"
        | "internship_networking";
      badge_tier: "bronze" | "silver" | "gold";
    };
  };
};
