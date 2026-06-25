import { create } from "zustand";

import type { GroupChatMessage, GroupChatSummary } from "@appTypes/index";
import {
  fetchGroupMessages,
  fetchJoinedGroupChats,
  sendGroupMessage,
  subscribeToGroupMessages,
} from "@services/groupMessagesService";

interface GroupMessagesState {
  groupChats: GroupChatSummary[];
  messagesByGroup: Record<string, GroupChatMessage[]>;
  isChatsLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshGroupChats: (userId: string) => Promise<void>;
  loadGroupMessages: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, body: string, userId: string) => Promise<void>;
  subscribeToGroup: (groupId: string, userId: string) => () => void;
  reset: () => void;
}

export const useGroupMessagesStore = create<GroupMessagesState>((set, get) => ({
  groupChats: [],
  messagesByGroup: {},
  isChatsLoading: false,
  isThreadLoading: false,
  isSending: false,
  error: null,

  async refreshGroupChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const groupChats = await fetchJoinedGroupChats(userId);

      set({
        groupChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        groupChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load group chats right now.",
      });
    }
  },

  async loadGroupMessages(groupId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchGroupMessages(groupId);

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

  subscribeToGroup(groupId, userId) {
    return subscribeToGroupMessages(groupId, () => {
      void Promise.all([
        get().loadGroupMessages(groupId),
        get().refreshGroupChats(userId),
      ]);
    });
  },

  reset() {
    set({
      groupChats: [],
      messagesByGroup: {},
      isChatsLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
