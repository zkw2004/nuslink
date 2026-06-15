import { create } from "zustand";

import type {
  ConnectedProfilePreview,
  DirectConversationSummary,
  DirectMessage,
} from "@appTypes/index";
import {
  fetchConnectedProfiles,
  fetchDirectConversations,
  fetchDirectMessages,
  getOrCreateDirectConversation,
  sendDirectMessage,
} from "@services/directMessagesService";

interface DirectMessagesState {
  conversations: DirectConversationSummary[];
  connectedProfiles: ConnectedProfilePreview[];
  messagesByConversation: Record<string, DirectMessage[]>;
  isInboxLoading: boolean;
  isThreadLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshInbox: (userId: string) => Promise<void>;
  openConversationWithUser: (otherUserId: string, userId: string) => Promise<string>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    body: string,
    userId: string,
  ) => Promise<void>;
  reset: () => void;
}

export const useDirectMessagesStore = create<DirectMessagesState>((set, get) => ({
  conversations: [],
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
        connectedProfiles,
        isInboxLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        conversations: [],
        connectedProfiles: [],
        isInboxLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load direct messages right now.",
      });
    }
  },

  async openConversationWithUser(otherUserId, userId) {
    const existingConversation = get().conversations.find(
      (conversation) => conversation.other_user.id === otherUserId,
    );

    if (existingConversation) {
      return existingConversation.id;
    }

    const conversationId = await getOrCreateDirectConversation(otherUserId);
    await get().refreshInbox(userId);
    return conversationId;
  },

  async loadConversationMessages(conversationId) {
    set({ isThreadLoading: true, error: null });

    try {
      const messages = await fetchDirectMessages(conversationId);

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

  async sendMessage(conversationId, body, userId) {
    set({ isSending: true, error: null });

    try {
      await sendDirectMessage(conversationId, body);
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

  reset() {
    set({
      conversations: [],
      connectedProfiles: [],
      messagesByConversation: {},
      isInboxLoading: false,
      isThreadLoading: false,
      isSending: false,
      error: null,
    });
  },
}));
