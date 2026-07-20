import { create } from "zustand";

import type {
  ChatKind,
  ChatMeetup,
  ChatPinnedMessage,
  ChatPoll,
} from "@appTypes/index";
import {
  closeDueChatMeetups,
  createChatMeetup,
  createChatPoll,
  fetchChatMeetupsForMessages,
  fetchChatPollsForMessages,
  fetchPinnedMessagesForMessages,
  setChatMessagePinned,
  subscribeToChatFeatureChanges,
  unvoteChatMeetup,
  unvoteChatPoll,
  voteChatMeetup,
  voteChatPoll,
} from "@services/chatFeaturesService";

function getChatKey(kind: ChatKind, chatId: string) {
  return `${kind}:${chatId}`;
}

interface ChatFeaturesState {
  pollsByMessageId: Record<string, ChatPoll>;
  meetupsByMessageId: Record<string, ChatMeetup>;
  pinnedMessagesByChatKey: Record<string, ChatPinnedMessage[]>;
  isLoading: boolean;
  isCreatingPoll: boolean;
  isCreatingMeetup: boolean;
  isVoting: boolean;
  isVotingMeetup: boolean;
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
  createMeetup: (
    kind: ChatKind,
    chatId: string,
    title: string,
    options: { label: string; source: "suggested" | "custom" }[],
    closesAt: string,
  ) => Promise<void>;
  votePoll: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    pollId: string,
    optionId: string,
  ) => Promise<void>;
  unvotePoll: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    pollId: string,
  ) => Promise<void>;
  voteMeetup: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    meetupId: string,
    optionId: string,
  ) => Promise<void>;
  unvoteMeetup: (
    kind: ChatKind,
    chatId: string,
    messageIds: string[],
    currentUserId: string,
    meetupId: string,
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
  meetupsByMessageId: {},
  pinnedMessagesByChatKey: {},
  isLoading: false,
  isCreatingPoll: false,
  isCreatingMeetup: false,
  isVoting: false,
  isVotingMeetup: false,
  isPinning: false,
  error: null,

  async loadFeatures(kind, chatId, messageIds, currentUserId) {
    set({ isLoading: true, error: null });

    try {
      await closeDueChatMeetups();
      const [pollsByMessageId, meetupsByMessageId, pinnedMessages] =
        await Promise.all([
          fetchChatPollsForMessages(kind, messageIds, currentUserId),
          fetchChatMeetupsForMessages(kind, messageIds, currentUserId),
          fetchPinnedMessagesForMessages(kind, messageIds),
        ]);
      const chatKey = getChatKey(kind, chatId);

      set((state) => ({
        pollsByMessageId: {
          ...state.pollsByMessageId,
          ...pollsByMessageId,
        },
        meetupsByMessageId: {
          ...state.meetupsByMessageId,
          ...meetupsByMessageId,
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

  async createMeetup(kind, chatId, title, options, closesAt) {
    set({ isCreatingMeetup: true, error: null });

    try {
      await createChatMeetup(kind, chatId, title, options, closesAt);
      set({ isCreatingMeetup: false, error: null });
    } catch (error) {
      set({
        isCreatingMeetup: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not create this meetup.",
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

  async unvotePoll(kind, chatId, messageIds, currentUserId, pollId) {
    set({ isVoting: true, error: null });

    try {
      await unvoteChatPoll(pollId);
      await get().loadFeatures(kind, chatId, messageIds, currentUserId);
      set({ isVoting: false, error: null });
    } catch (error) {
      set({
        isVoting: false,
        error:
          error instanceof Error ? error.message : "Could not remove your vote.",
      });
      throw error;
    }
  },

  async voteMeetup(kind, chatId, messageIds, currentUserId, meetupId, optionId) {
    set({ isVotingMeetup: true, error: null });

    try {
      await voteChatMeetup(meetupId, optionId);
      await get().loadFeatures(kind, chatId, messageIds, currentUserId);
      set({ isVotingMeetup: false, error: null });
    } catch (error) {
      set({
        isVotingMeetup: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not vote on this meetup.",
      });
      throw error;
    }
  },

  async unvoteMeetup(kind, chatId, messageIds, currentUserId, meetupId) {
    set({ isVotingMeetup: true, error: null });

    try {
      await unvoteChatMeetup(meetupId);
      await get().loadFeatures(kind, chatId, messageIds, currentUserId);
      set({ isVotingMeetup: false, error: null });
    } catch (error) {
      set({
        isVotingMeetup: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not remove your meetup vote.",
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
    return subscribeToChatFeatureChanges(kind, chatId, () => {
      void get().loadFeatures(kind, chatId, messageIds, currentUserId);
    });
  },

  reset() {
    set({
      pollsByMessageId: {},
      meetupsByMessageId: {},
      pinnedMessagesByChatKey: {},
      isLoading: false,
      isCreatingPoll: false,
      isCreatingMeetup: false,
      isVoting: false,
      isVotingMeetup: false,
      isPinning: false,
      error: null,
    });
  },
}));
