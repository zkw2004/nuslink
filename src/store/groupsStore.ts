import { create } from "zustand";

import { supabase } from "@lib/supabase";
import { getCurrentSemester } from "@lib/nusmods";
import type { Database } from "@appTypes/database";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type GroupType = Database["public"]["Tables"]["groups"]["Row"]["type"];
type PrivacySetting = GroupRow["privacy"];
type SemiPrivateRestriction = GroupRow["restriction"];
type DiscoverGroupRow = Database["public"]["Functions"]["get_discover_groups"]["Returns"][number];

export interface DiscoverGroup {
  id: string;
  name: string;
  type: GroupType;
  module_code: string | null;
  description: string | null;
  creator_id: string;
  privacy: PrivacySetting;
  restriction: SemiPrivateRestriction;
  semester: string;
  joined: boolean;
  can_join: boolean;
  request_pending: boolean;
  join_note: string;
  invite_code: string | null;
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
  privacy: PrivacySetting;
  restriction: SemiPrivateRestriction;
  semester: string;
  description: string;
  minSize: number | null;
  maxSize: number | null;
  venue: string;
};

type CreateGroupResult = {
  groupId: string;
  inviteCode: string | null;
};

interface GroupsState {
  groups: DiscoverGroup[];
  isLoading: boolean;
  error: string | null;
  refreshGroups: (userId?: string | null) => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  inviteUserToGroup: (groupId: string, recipientId: string) => Promise<string>;
  requestToJoinGroup: (groupId: string, userId: string) => Promise<void>;
  joinGroup: (groupId: string, userId: string) => Promise<void>;
  deleteGroup: (groupId: string, userId: string) => Promise<void>;
  reset: () => void;
}

function mapGroups(groups: DiscoverGroupRow[]): DiscoverGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    module_code: group.module_code,
    description: group.description,
    creator_id: group.creator_id,
    privacy: group.privacy,
    restriction: group.restriction,
    semester: group.semester,
    joined: group.joined,
    can_join: group.can_join,
    request_pending: group.request_pending,
    join_note: group.join_note,
    invite_code: group.invite_code,
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

    const { semester } = getCurrentSemester();
    const { data: groups, error: groupsError } = await supabase.rpc(
      "get_discover_groups",
      {
        semester_input: semester,
      },
    );

    if (groupsError) {
      set({ isLoading: false, error: groupsError.message });
      return;
    }

    if (!groups || groups.length === 0) {
      set({ groups: [], isLoading: false, error: null });
      return;
    }

    set({
      groups: mapGroups(groups),
      isLoading: false,
      error: null,
    });
  },

  async createGroup(input) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase.rpc("create_group", {
      module_code_input: input.module.code,
      module_name_input: input.module.name,
      module_department_input: input.module.department,
      module_faculty_input: input.module.faculty,
      group_name_input: input.name,
      group_type_input: input.type,
      privacy_input: input.privacy,
      restriction_input: input.restriction,
      semester_input: input.semester,
      description_input: input.description,
      min_size_input: input.minSize,
      max_size_input: input.maxSize,
      venue_input: input.venue,
    });

    if (error) {
      throw new Error(error.message);
    }

    await get().refreshGroups(input.creatorId);

    const createdGroup = data?.[0];
    if (!createdGroup) {
      throw new Error("Group was created, but no group id was returned.");
    }

    return {
      groupId: createdGroup.group_id,
      inviteCode: createdGroup.invite_code,
    };
  },

  async joinGroup(groupId, userId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.rpc("join_visible_group", {
      group_id_input: groupId,
    });

    if (error) {
      throw new Error(error.message);
    }

    await get().refreshGroups(userId);
  },

  async inviteUserToGroup(groupId, recipientId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase.rpc("create_group_invitation", {
      group_id_input: groupId,
      recipient_id_input: recipientId,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Invitation was not created.");
    }

    return data;
  },

  async requestToJoinGroup(groupId, userId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.rpc("create_group_join_request", {
      group_id_input: groupId,
    });

    if (error) {
      throw new Error(error.message);
    }

    await get().refreshGroups(userId);
  },

  async deleteGroup(groupId, userId) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("creator_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    await get().refreshGroups(userId);
  },

  reset() {
    set({ groups: [], isLoading: false, error: null });
  },
}));
