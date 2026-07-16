import { create } from "zustand";

import type { GroupChatMessage, GroupChatSummary } from "@appTypes/index";
import {
  archiveGroupChats as archiveGroupChatsService,
  deleteGroupChats as deleteGroupChatsService,
  fetchGroupMessages,
  fetchJoinedGroupChats,
  markGroupChatRead,
  markGroupChatsRead as markGroupChatsReadService,
  muteGroupChats as muteGroupChatsService,
  restoreGroupChat as restoreGroupChatService,
  sendGroupMessage,
  subscribeToGroupMessages,
  unarchiveGroupChats as unarchiveGroupChatsService,
} from "@services/groupMessagesService";

interface GroupMessagesState {
  groupChats: GroupChatSummary[];
  archivedGroupChats: GroupChatSummary[];
  messagesByGroup: Record<string, GroupChatMessage[]>;
  isChatsLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshGroupChats: (userId: string) => Promise<void>;
  refreshArchivedGroupChats: (userId: string) => Promise<void>;
  loadGroupMessages: (groupId: string, userId?: string) => Promise<void>;
  markGroupChatsRead: (groupIds: string[], userId: string) => Promise<void>;
  archiveGroupChats: (groupIds: string[], userId: string) => Promise<void>;
  unarchiveGroupChats: (groupIds: string[], userId: string) => Promise<void>;
  deleteGroupChats: (groupIds: string[], userId: string) => Promise<void>;
  muteGroupChats: (
    groupIds: string[],
    userId: string,
    muted: boolean,
  ) => Promise<void>;
  restoreGroupChat: (groupId: string, userId: string) => Promise<void>;
  sendMessage: (groupId: string, body: string, userId: string) => Promise<void>;
  subscribeToGroup: (groupId: string, userId: string) => () => void;
  reset: () => void;
}

export const useGroupMessagesStore = create<GroupMessagesState>((set, get) => ({
  groupChats: [],
  archivedGroupChats: [],
  messagesByGroup: {},
  isChatsLoading: false,
  isThreadLoading: false,
  isSending: false,
  error: null,

  async refreshGroupChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const [groupChats, archivedGroupChats] = await Promise.all([
        fetchJoinedGroupChats(userId, "active"),
        fetchJoinedGroupChats(userId, "archived"),
      ]);

      set({
        groupChats,
        archivedGroupChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        groupChats: [],
        archivedGroupChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load group chats right now.",
      });
    }
  },

  async refreshArchivedGroupChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const archivedGroupChats = await fetchJoinedGroupChats(userId, "archived");
      set({
        archivedGroupChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        archivedGroupChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load archived group chats right now.",
      });
    }
  },

  async loadGroupMessages(groupId, userId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchGroupMessages(groupId);
      if (userId) {
        await markGroupChatRead(groupId, userId);
      }

      set((state) => ({
        messagesByGroup: {
          ...state.messagesByGroup,
          [groupId]: messages,
        },
        isThreadLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isThreadLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load this group chat right now.",
      });
    }
  },

  async sendMessage(groupId, body, userId) {
    set({ isSending: true, error: null });

    try {
      await sendGroupMessage(groupId, body, userId);
      const [messages] = await Promise.all([
        fetchGroupMessages(groupId),
        get().refreshGroupChats(userId),
      ]);

      set((state) => ({
        messagesByGroup: {
          ...state.messagesByGroup,
          [groupId]: messages,
        },
        isSending: false,
        error: null,
      }));
    } catch (error) {
      set({
        isSending: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not send your group message right now.",
      });
      throw error;
    }
  },

  async markGroupChatsRead(groupIds, userId) {
    await markGroupChatsReadService(groupIds, userId);
    await get().refreshGroupChats(userId);
  },

  async archiveGroupChats(groupIds, userId) {
    await archiveGroupChatsService(groupIds, userId);
    await get().refreshGroupChats(userId);
  },

  async unarchiveGroupChats(groupIds, userId) {
    await unarchiveGroupChatsService(groupIds, userId);
    await get().refreshGroupChats(userId);
  },

  async deleteGroupChats(groupIds, userId) {
    await deleteGroupChatsService(groupIds, userId);
    await get().refreshGroupChats(userId);
  },

  async muteGroupChats(groupIds, userId, muted) {
    await muteGroupChatsService(groupIds, userId, muted);
    await get().refreshGroupChats(userId);
  },

  async restoreGroupChat(groupId, userId) {
    await restoreGroupChatService(groupId, userId);
    await get().refreshGroupChats(userId);
  },

  subscribeToGroup(groupId, userId) {
    return subscribeToGroupMessages(groupId, () => {
      void Promise.all([
        get().loadGroupMessages(groupId, userId),
        get().refreshGroupChats(userId),
      ]);
    });
  },

  reset() {
    set({
      groupChats: [],
      archivedGroupChats: [],
      messagesByGroup: {},
      isChatsLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
