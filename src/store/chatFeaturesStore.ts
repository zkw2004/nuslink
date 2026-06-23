import { create } from "zustand";

import type { ChatKind, ChatPinnedMessage, ChatPoll } from "@appTypes/index";
import {
  createChatPoll,
  fetchChatPollsForMessages,
  fetchPinnedMessagesForMessages,
  setChatMessagePinned,
  subscribeToChatFeatureChanges,
  voteChatPoll,
} from "@services/chatFeaturesService";

function getChatKey(kind: ChatKind, chatId: string) {
  return `${kind}:${chatId}`;
}

interface ChatFeaturesState {
  pollsByMessageId: Record<string, ChatPoll>;
  pinnedMessagesByChatKey: Record<string, ChatPinnedMessage[]>;
  isLoading: boolean;
  isCreatingPoll: boolean;
  isVoting: boolean;
  isPinning: boolean;
  error: string | null;
  loadFeatures: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
  ) => Promise<void>;
  createPoll: (
    kind: ChatKind,
    chatId: string,
    question: string,
    options: string[],
  ) => Promise<void>;
  votePoll: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    pollId: string,
    optionId: string,
  ) => Promise<void>;
  setPinned: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    messageId: string,
    pinned: boolean,
  ) => Promise<void>;
  subscribeToFeatureChanges: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
  ) => () => void;
  reset: () => void;
}

export const useChatFeaturesStore = create<ChatFeaturesState>((set, get) => ({
  pollsByMessageId: {},
  pinnedMessagesByChatKey: {},
  isLoading: false,
  isCreatingPoll: false,
  isVoting: false,
  isPinning: false,
  error: null,

  async loadFeatures(kind, chatId, messageIds, currentUserId) {
    set({ isLoading: true, error: null });

    try {
      const [pollsByMessageId, pinnedMessages] = await Promise.all([
        fetchChatPollsForMessages(kind, messageIds, currentUserId),
        fetchPinnedMessagesForMessages(kind, messageIds),
      ]);
      const chatKey = getChatKey(kind, chatId);

      set((state) => ({
        pollsByMessageId: {
          ...state.pollsByMessageId,
          ...pollsByMessageId,
        },
        pinnedMessagesByChatKey: {
          ...state.pinnedMessagesByChatKey,
          [chatKey]: pinnedMessages,
        },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load chat features right now.",
      });
    }
  },

  async createPoll(kind, chatId, question, options) {
    set({ isCreatingPoll: true, error: null });

    try {
      await createChatPoll(kind, chatId, question, options);
      set({ isCreatingPoll: false, error: null });
    } catch (error) {
      set({
        isCreatingPoll: false,
        error:
          error instanceof Error ? error.message : "Could not create this poll.",
      });
      throw error;
    }
  },

  async votePoll(kind, chatId, messageIds, currentUserId, pollId, optionId) {
    set({ isVoting: true, error: null });

    try {
      await voteChatPoll(pollId, optionId);
      await get().loadFeatures(kind, chatId, messageIds, currentUserId);
      set({ isVoting: false, error: null });
    } catch (error) {
      set({
        isVoting: false,
        error:
          error instanceof Error ? error.message : "Could not vote on this poll.",
      });
      throw error;
    }
  },

  async setPinned(
    kind,
    chatId,
    messageIds,
    currentUserId,
    messageId,
    pinned,
  ) {
    set({ isPinning: true, error: null });

    try {
      await setChatMessagePinned(kind, messageId, pinned);
      await get().loadFeatures(kind, chatId, messageIds, currentUserId);
      set({ isPinning: false, error: null });
    } catch (error) {
      set({
        isPinning: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not update pinned messages.",
      });
      throw error;
    }
  },

  subscribeToFeatureChanges(kind, chatId, messageIds, currentUserId) {
    return subscribeToChatFeatureChanges(() => {
      void get().loadFeatures(kind, chatId, messageIds, currentUserId);
    });
  },

  reset() {
    set({
      pollsByMessageId: {},
      pinnedMessagesByChatKey: {},
      isLoading: false,
      isCreatingPoll: false,
      isVoting: false,
      isPinning: false,
      error: null,
    });
  },
}));
