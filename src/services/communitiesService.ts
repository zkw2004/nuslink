import { api } from "@lib/api";

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
