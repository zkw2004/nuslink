import { create } from "zustand";

import type {
  ConnectedProfilePreview,
  DirectConversationSummary,
  DirectMessageAttachmentInput,
  DirectMessage,
} from "@appTypes/index";
import {
  archiveDirectConversations,
  deleteDirectConversations,
  fetchConnectedProfiles,
  fetchDirectConversations,
  fetchDirectMessages,
  getOrCreateDirectConversation,
  markDirectConversationRead,
  markDirectConversationsRead,
  muteDirectConversations,
  restoreDirectConversation,
  sendDirectMessage,
  subscribeToDirectMessages,
  unarchiveDirectConversations,
} from "@services/directMessagesService";

interface DirectMessagesState {
  conversations: DirectConversationSummary[];
  archivedConversations: DirectConversationSummary[];
  connectedProfiles: ConnectedProfilePreview[];
  messagesByConversation: Record<string, DirectMessage[]>;
  isInboxLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshInbox: (userId: string) => Promise<void>;
  refreshArchivedInbox: (userId: string) => Promise<void>;
  openConversationWithUser: (otherUserId: string, userId: string) => Promise<string>;
  loadConversationMessages: (conversationId: string, userId?: string) => Promise<void>;
  markConversationsRead: (conversationIds: string[], userId: string) => Promise<void>;
  archiveConversations: (conversationIds: string[], userId: string) => Promise<void>;
  unarchiveConversations: (conversationIds: string[], userId: string) => Promise<void>;
  deleteConversations: (conversationIds: string[], userId: string) => Promise<void>;
  muteConversations: (
    conversationIds: string[],
    userId: string,
    muted: boolean,
  ) => Promise<void>;
  sendMessage: (
    conversationId: string,
    body: string,
    userId: string,
    attachment?: DirectMessageAttachmentInput | null,
  ) => Promise<void>;
  appendMessage: (message: DirectMessage) => void;
  subscribeToConversation: (conversationId: string, userId: string) => () => void;
  reset: () => void;
}

export const useDirectMessagesStore = create<DirectMessagesState>((set, get) => ({
  conversations: [],
  archivedConversations: [],
  connectedProfiles: [],
  messagesByConversation: {},
  isInboxLoading: false,
  isThreadLoading: false,
  isSending: false,
  error: null,

  async refreshInbox(userId) {
    set({ isInboxLoading: true, error: null });

    try {
      const [connectedProfiles, conversations] = await Promise.all([
        fetchConnectedProfiles(userId),
        fetchDirectConversations(userId),
      ]);

      set({
        conversations,
        archivedConversations: await fetchDirectConversations(userId, "archived"),
        connectedProfiles,
        isInboxLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        conversations: [],
        archivedConversations: [],
        connectedProfiles: [],
        isInboxLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load direct messages right now.",
      });
    }
  },

  async refreshArchivedInbox(userId) {
    set({ isInboxLoading: true, error: null });

    try {
      const archivedConversations = await fetchDirectConversations(userId, "archived");

      set({
        archivedConversations,
        isInboxLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        archivedConversations: [],
        isInboxLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load archived direct messages right now.",
      });
    }
  },

  async openConversationWithUser(otherUserId, userId) {
    const existingConversation = [
      ...get().conversations,
      ...get().archivedConversations,
    ].find(
      (conversation) => conversation.other_user.id === otherUserId,
    );

    if (existingConversation) {
      if (existingConversation.archived_at || existingConversation.deleted_at) {
        await restoreDirectConversation(existingConversation.id, userId);
        await get().refreshInbox(userId);
      }
      return existingConversation.id;
    }

    const conversationId = await getOrCreateDirectConversation(otherUserId);
    await restoreDirectConversation(conversationId, userId);
    await get().refreshInbox(userId);
    return conversationId;
  },

  async loadConversationMessages(conversationId, userId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchDirectMessages(conversationId);
      if (userId) {
        await markDirectConversationRead(conversationId, userId);
      }

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
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
            : "Could not load this conversation right now.",
      });
    }
  },

  async markConversationsRead(conversationIds, userId) {
    await markDirectConversationsRead(conversationIds, userId);
    await get().refreshInbox(userId);
  },

  async archiveConversations(conversationIds, userId) {
    await archiveDirectConversations(conversationIds, userId);
    await get().refreshInbox(userId);
  },

  async unarchiveConversations(conversationIds, userId) {
    await unarchiveDirectConversations(conversationIds, userId);
    await get().refreshInbox(userId);
  },

  async deleteConversations(conversationIds, userId) {
    await deleteDirectConversations(conversationIds, userId);
    await get().refreshInbox(userId);
  },

  async muteConversations(conversationIds, userId, muted) {
    await muteDirectConversations(conversationIds, userId, muted);
    await get().refreshInbox(userId);
  },

  async sendMessage(conversationId, body, userId, attachment) {
    set({ isSending: true, error: null });

    try {
      await sendDirectMessage(conversationId, body, attachment);
      const [messages] = await Promise.all([
        fetchDirectMessages(conversationId),
        get().refreshInbox(userId),
      ]);

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
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
            : "Could not send your message right now.",
      });
      throw error;
    }
  },

  appendMessage(message) {
    set((state) => {
      const existingMessages = state.messagesByConversation[message.conversation_id] ?? [];

      if (existingMessages.some((existingMessage) => existingMessage.id === message.id)) {
        return state;
      }

      const nextMessages = [...existingMessages, message].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      );

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversation_id]: nextMessages,
        },
      };
    });
  },

  subscribeToConversation(conversationId, userId) {
    return subscribeToDirectMessages(conversationId, (message) => {
      get().appendMessage(message);
      void get().refreshInbox(userId);
    });
  },

  reset() {
    set({
      conversations: [],
      archivedConversations: [],
      connectedProfiles: [],
      messagesByConversation: {},
      isInboxLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
