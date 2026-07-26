import { api } from "@lib/api";
import { supabase } from "@lib/supabase";
import type { ModerationOutcome } from "@appTypes/index";

type CreateCommunityPayload = {
  name: string;
  description: string;
  tags: string[];
  privacy: "open" | "request_approval";
};

type CreateCommunityResponse = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  join_policy: "open" | "request_approval";
  creator_id: string;
};

export async function createCommunity(payload: CreateCommunityPayload) {
  return api.post<CreateCommunityResponse>("/v1/communities", payload);
}

export async function updateCommunityModerationOutcome(
  communityId: string,
  moderationOutcome: ModerationOutcome,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("communities")
    .update({ moderation_outcome: moderationOutcome })
    .eq("id", communityId);

  if (error) {
    throw new Error(error.message);
  }
}
