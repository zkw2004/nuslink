import { api } from "@lib/api";

export type GroupDraft = {
  name: string | null;
  type:
    | "study_group"
    | "hackathon_team"
    | "project_team"
    | "tutoring_session"
    | null;
  module_code: string | null;
  privacy: "public" | "semi_private" | "private" | null;
  restriction: "same_module" | "same_year" | "same_faculty" | null;
  description: string | null;
  venue: string | null;
  min_size: number | null;
  max_size: number | null;
};

export function draftGroupFromPrompt(prompt: string) {
  return api.post<GroupDraft>("/v1/groups/draft", { prompt: prompt.trim() });
}
