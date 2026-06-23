import { create } from "zustand";

import type { CommunityChatMessage, CommunityChatSummary } from "@appTypes/index";
import {
  fetchCommunityMessages,
  fetchJoinedCommunityChats,
  sendCommunityMessage,
  subscribeToCommunityMessages,
} from "@services/communityMessagesService";

interface CommunityMessagesState {
  communityChats: CommunityChatSummary[];
  messagesByCommunity: Record<string, CommunityChatMessage[]>;
  isChatsLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshCommunityChats: (userId: string) => Promise<void>;
  loadCommunityMessages: (communityId: string) => Promise<void>;
  sendMessage: (communityId: string, body: string, userId: string) => Promise<void>;
  subscribeToCommunity: (communityId: string, userId: string) => () => void;
  reset: () => void;
}

export const useCommunityMessagesStore = create<CommunityMessagesState>((set, get) => ({
  communityChats: [],
  messagesByCommunity: {},
  isChatsLoading: false,
  isThreadLoading: false,
  isSending: false,
  error: null,

  async refreshCommunityChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const communityChats = await fetchJoinedCommunityChats(userId);

      set({
        communityChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        communityChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load community chats right now.",
      });
    }
  },

  async loadCommunityMessages(communityId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchCommunityMessages(communityId);

      set((state) => ({
        messagesByCommunity: {
          ...state.messagesByCommunity,
          [communityId]: messages,
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
            : "Could not load this community chat right now.",
      });
    }
  },

  async sendMessage(communityId, body, userId) {
    set({ isSending: true, error: null });

    try {
      await sendCommunityMessage(communityId, body, userId);
      const [messages] = await Promise.all([
        fetchCommunityMessages(communityId),
        get().refreshCommunityChats(userId),
      ]);

      set((state) => ({
        messagesByCommunity: {
          ...state.messagesByCommunity,
          [communityId]: messages,
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
            : "Could not send your community message right now.",
      });
      throw error;
    }
  },

  subscribeToCommunity(communityId, userId) {
    return subscribeToCommunityMessages(communityId, () => {
      void Promise.all([
        get().loadCommunityMessages(communityId),
        get().refreshCommunityChats(userId),
      ]);
    });
  },

  reset() {
    set({
      communityChats: [],
      messagesByCommunity: {},
      isChatsLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
