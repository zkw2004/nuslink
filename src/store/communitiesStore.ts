import { create } from "zustand";

import { supabase } from "@lib/supabase";
import type { Database } from "@appTypes/database";
import type { ModerationOutcome } from "@appTypes/index";
import {
  createCommunity as createCommunityRequest,
  updateCommunityModerationOutcome,
} from "@services/communitiesService";

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];

export interface DiscoverCommunity {
  id: string;
  name: string;
  description: string;
  type: CommunityRow["type"];
  join_policy: CommunityRow["join_policy"];
  tags: string[];
  creator_id: string;
  joined: boolean;
}

type CreateCommunityInput = {
  userId: string;
  name: string;
  description: string;
  tags: string[];
  privacy: "open" | "request_approval";
  moderationOutcome?: ModerationOutcome;
};

interface CommunitiesState {
  communities: DiscoverCommunity[];
  isLoading: boolean;
  error: string | null;
  refreshCommunities: (userId?: string | null) => Promise<void>;
  createCommunity: (input: CreateCommunityInput) => Promise<string>;
  joinCommunity: (communityId: string, userId: string) => Promise<void>;
  reset: () => void;
}

function mapCommunities(
  communities: CommunityRow[],
  joinedCommunityIds: Set<string>,
): DiscoverCommunity[] {
  return communities.map((community) => ({
    id: community.id,
    name: community.name,
    description: community.description,
    type: community.type,
    join_policy: community.join_policy,
    tags: community.tags ?? [],
    creator_id: community.creator_id,
    joined: joinedCommunityIds.has(community.id),
  }));
}

export const useCommunitiesStore = create<CommunitiesState>((set, get) => ({
  communities: [],
  isLoading: false,
  error: null,

  async refreshCommunities(userId) {
    if (!supabase) {
      set({
        communities: [],
        isLoading: false,
        error: "Supabase is not configured.",
      });
      return;
    }

    set({ isLoading: true, error: null });

    const { data: communities, error: communitiesError } = await supabase
      .from("communities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (communitiesError) {
      set({ communities: [], isLoading: false, error: communitiesError.message });
      return;
    }

    const communityIds = communities.map((community) => community.id);

    if (communityIds.length === 0) {
      set({ communities: [], isLoading: false, error: null });
      return;
    }

    const { data: joinedData, error: joinedError } = userId
      ? await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", userId)
          .in("community_id", communityIds)
      : { data: [], error: null };

    if (joinedError) {
      set({ communities: [], isLoading: false, error: joinedError.message });
      return;
    }

    const joinedCommunityIds = new Set(
      (joinedData ?? []).map((membership) => membership.community_id),
    );

    set({
      communities: mapCommunities(communities, joinedCommunityIds),
      isLoading: false,
      error: null,
    });
  },

  async joinCommunity(communityId, userId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
    });

    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }

    await get().refreshCommunities(userId);
  },

  async createCommunity(input) {
    const createdCommunity = await createCommunityRequest({
      name: input.name,
      description: input.description,
      tags: input.tags,
      privacy: input.privacy,
    });

    if (input.moderationOutcome) {
      await updateCommunityModerationOutcome(
        createdCommunity.id,
        input.moderationOutcome,
      );
    }

    await get().refreshCommunities(input.userId);
    return createdCommunity.id;
  },

  reset() {
    set({ communities: [], isLoading: false, error: null });
  },
}));
