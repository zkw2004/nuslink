import { create } from "zustand";

import type {
  CommunityChatMessage,
  CommunityChatSummary,
  DirectMessageAttachmentInput,
  ModerationOutcome,
} from "@appTypes/index";
import {
  archiveCommunityChats as archiveCommunityChatsService,
  deleteCommunityChats as deleteCommunityChatsService,
  fetchCommunityMessages,
  fetchJoinedCommunityChats,
  markCommunityChatRead,
  markCommunityChatsRead as markCommunityChatsReadService,
  muteCommunityChats as muteCommunityChatsService,
  restoreCommunityChat as restoreCommunityChatService,
  sendCommunityMessage,
  subscribeToCommunityMessages,
  unarchiveCommunityChats as unarchiveCommunityChatsService,
} from "@services/communityMessagesService";

interface CommunityMessagesState {
  communityChats: CommunityChatSummary[];
  archivedCommunityChats: CommunityChatSummary[];
  messagesByCommunity: Record<string, CommunityChatMessage[]>;
  isChatsLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshCommunityChats: (userId: string) => Promise<void>;
  refreshArchivedCommunityChats: (userId: string) => Promise<void>;
  loadCommunityMessages: (communityId: string, userId?: string) => Promise<void>;
  markCommunityChatsRead: (communityIds: string[], userId: string) => Promise<void>;
  archiveCommunityChats: (communityIds: string[], userId: string) => Promise<void>;
  unarchiveCommunityChats: (communityIds: string[], userId: string) => Promise<void>;
  deleteCommunityChats: (communityIds: string[], userId: string) => Promise<void>;
  muteCommunityChats: (
    communityIds: string[],
    userId: string,
    muted: boolean,
  ) => Promise<void>;
  restoreCommunityChat: (communityId: string, userId: string) => Promise<void>;
  sendMessage: (
    communityId: string,
    body: string,
    userId: string,
    attachment?: DirectMessageAttachmentInput | null,
    moderationOutcome?: ModerationOutcome,
  ) => Promise<string>;
  subscribeToCommunity: (communityId: string, userId: string) => () => void;
  reset: () => void;
}

export const useCommunityMessagesStore = create<CommunityMessagesState>((set, get) => ({
  communityChats: [],
  archivedCommunityChats: [],
  messagesByCommunity: {},
  isChatsLoading: false,
  isThreadLoading: false,
  isSending: false,
  error: null,

  async refreshCommunityChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const [communityChats, archivedCommunityChats] = await Promise.all([
        fetchJoinedCommunityChats(userId, "active"),
        fetchJoinedCommunityChats(userId, "archived"),
      ]);

      set({
        communityChats,
        archivedCommunityChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        communityChats: [],
        archivedCommunityChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load community chats right now.",
      });
    }
  },

  async refreshArchivedCommunityChats(userId) {
    set({ isChatsLoading: true, error: null });

    try {
      const archivedCommunityChats = await fetchJoinedCommunityChats(
        userId,
        "archived",
      );

      set({
        archivedCommunityChats,
        isChatsLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        archivedCommunityChats: [],
        isChatsLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load archived community chats right now.",
      });
    }
  },

  async loadCommunityMessages(communityId, userId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchCommunityMessages(communityId);
      if (userId) {
        await markCommunityChatRead(communityId, userId);
      }

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

  async sendMessage(communityId, body, userId, attachment, moderationOutcome) {
    set({ isSending: true, error: null });

    try {
      const messageId = await sendCommunityMessage(
        communityId,
        body,
        userId,
        attachment,
        moderationOutcome,
      );
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
      return messageId;
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

  async markCommunityChatsRead(communityIds, userId) {
    await markCommunityChatsReadService(communityIds, userId);
    await get().refreshCommunityChats(userId);
  },

  async archiveCommunityChats(communityIds, userId) {
    await archiveCommunityChatsService(communityIds, userId);
    await get().refreshCommunityChats(userId);
  },

  async unarchiveCommunityChats(communityIds, userId) {
    await unarchiveCommunityChatsService(communityIds, userId);
    await get().refreshCommunityChats(userId);
  },

  async deleteCommunityChats(communityIds, userId) {
    await deleteCommunityChatsService(communityIds, userId);
    await get().refreshCommunityChats(userId);
  },

  async muteCommunityChats(communityIds, userId, muted) {
    await muteCommunityChatsService(communityIds, userId, muted);
    await get().refreshCommunityChats(userId);
  },

  async restoreCommunityChat(communityId, userId) {
    await restoreCommunityChatService(communityId, userId);
    await get().refreshCommunityChats(userId);
  },

  subscribeToCommunity(communityId, userId) {
    return subscribeToCommunityMessages(communityId, () => {
      void Promise.all([
        get().loadCommunityMessages(communityId, userId),
        get().refreshCommunityChats(userId),
      ]);
    });
  },

  reset() {
    set({
      communityChats: [],
      archivedCommunityChats: [],
      messagesByCommunity: {},
      isChatsLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
