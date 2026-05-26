import { create } from "zustand";

import { supabase } from "@lib/supabase";
import type { Database } from "@appTypes/database";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type GroupType = Database["public"]["Tables"]["groups"]["Row"]["type"];

export interface DiscoverGroup {
  id: string;
  name: string;
  type: GroupType;
  module_code: string | null;
  description: string | null;
  creator_id: string;
  privacy: GroupRow["privacy"];
  joined: boolean;
}

type CreateGroupInput = {
  creatorId: string;
  module: {
    code: string;
    name: string;
    faculty: string | null;
    department: string | null;
  };
  name: string;
  type: GroupType;
};

interface GroupsState {
  groups: DiscoverGroup[];
  isLoading: boolean;
  error: string | null;
  refreshGroups: (userId?: string | null) => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<string>;
  joinGroup: (groupId: string, userId: string) => Promise<void>;
  reset: () => void;
}

function mapGroups(
  groups: GroupRow[],
  joinedGroupIds: Set<string>,
): DiscoverGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    module_code: group.module_code,
    description: group.description,
    creator_id: group.creator_id,
    privacy: group.privacy,
    joined: joinedGroupIds.has(group.id),
  }));
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  isLoading: false,
  error: null,

  async refreshGroups(userId) {
    if (!supabase) {
      set({ groups: [], isLoading: false, error: "Supabase is not configured." });
      return;
    }

    set({ isLoading: true, error: null });

    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .eq("privacy", "public")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (groupsError) {
      set({ isLoading: false, error: groupsError.message });
      return;
    }

    const groupIds = groups.map((group) => group.id);

    if (groupIds.length === 0) {
      set({ groups: [], isLoading: false, error: null });
      return;
    }

    const { data: joinedData, error: joinedError } = userId
      ? await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId)
          .in("group_id", groupIds)
      : { data: [], error: null };

    if (joinedError) {
      set({ isLoading: false, error: joinedError.message });
      return;
    }

    const joinedGroupIds = new Set((joinedData ?? []).map((membership) => membership.group_id));

    set({
      groups: mapGroups(groups, joinedGroupIds),
      isLoading: false,
      error: null,
    });
  },

  async createGroup(input) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase.rpc("create_public_group", {
      module_code_input: input.module.code,
      module_name_input: input.module.name,
      module_department_input: input.module.department,
      module_faculty_input: input.module.faculty,
      group_name_input: input.name,
      group_type_input: input.type,
    });

    if (error) {
      throw new Error(error.message);
    }

    await get().refreshGroups(input.creatorId);
    return data;
  },

  async joinGroup(groupId, userId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
    });

    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }

    await get().refreshGroups(userId);
  },

  reset() {
    set({ groups: [], isLoading: false, error: null });
  },
}));
