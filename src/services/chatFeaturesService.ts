import { supabase } from "@lib/supabase";
import type { ChatKind, ChatPinnedMessage, ChatPoll } from "@appTypes/index";
import type { Database } from "@appTypes/database";

type ChatPollRow = Database["public"]["Tables"]["chat_polls"]["Row"];
type ChatPollOptionRow = Database["public"]["Tables"]["chat_poll_options"]["Row"];
type ChatPollVoteRow = Database["public"]["Tables"]["chat_poll_votes"]["Row"];
type ChatPinnedMessageRow =
  Database["public"]["Tables"]["chat_pinned_messages"]["Row"];

function getMessageColumn(kind: ChatKind) {
  return kind === "direct" ? "direct_message_id" : "community_message_id";
}

function getPollMessageId(kind: ChatKind, poll: ChatPollRow) {
  return kind === "direct" ? poll.direct_message_id : poll.community_message_id;
}

function getPinnedMessageId(kind: ChatKind, pinnedMessage: ChatPinnedMessageRow) {
  return kind === "direct"
    ? pinnedMessage.direct_message_id
    : pinnedMessage.community_message_id;
}

export async function fetchChatPollsForMessages(
  kind: ChatKind,
  messageIds: string[],
  currentUserId: string,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (messageIds.length === 0) {
    return {} as Record<string, ChatPoll>;
  }

  const messageColumn = getMessageColumn(kind);
  const { data: pollRows, error: pollsError } = await supabase
    .from("chat_polls")
    .select("*")
    .in(messageColumn, messageIds);

  if (pollsError) {
    throw new Error(pollsError.message);
  }

  const polls = (pollRows ?? []) as ChatPollRow[];
  const pollIds = polls.map((poll) => poll.id);

  if (pollIds.length === 0) {
    return {} as Record<string, ChatPoll>;
  }

  const [
    { data: optionRows, error: optionsError },
    { data: voteRows, error: votesError },
  ] = await Promise.all([
    supabase
      .from("chat_poll_options")
      .select("*")
      .in("poll_id", pollIds)
      .order("position", { ascending: true }),
    supabase.from("chat_poll_votes").select("*").in("poll_id", pollIds),
  ]);

  if (optionsError) {
    throw new Error(optionsError.message);
  }

  if (votesError) {
    throw new Error(votesError.message);
  }

  const optionsByPoll = new Map<string, ChatPollOptionRow[]>();
  for (const option of (optionRows ?? []) as ChatPollOptionRow[]) {
    optionsByPoll.set(option.poll_id, [
      ...(optionsByPoll.get(option.poll_id) ?? []),
      option,
    ]);
  }

  const votesByPoll = new Map<string, ChatPollVoteRow[]>();
  for (const vote of (voteRows ?? []) as ChatPollVoteRow[]) {
    votesByPoll.set(vote.poll_id, [...(votesByPoll.get(vote.poll_id) ?? []), vote]);
  }

  return polls.reduce<Record<string, ChatPoll>>((pollsByMessageId, poll) => {
    const messageId = getPollMessageId(kind, poll);

    if (!messageId) {
      return pollsByMessageId;
    }

    const pollOptions = optionsByPoll.get(poll.id) ?? [];
    const pollVotes = votesByPoll.get(poll.id) ?? [];
    const votesByOptionId = pollVotes.reduce<Record<string, number>>((counts, vote) => {
      counts[vote.option_id] = (counts[vote.option_id] ?? 0) + 1;
      return counts;
    }, {});
    const currentUserVote = pollVotes.find((vote) => vote.user_id === currentUserId);

    pollsByMessageId[messageId] = {
      id: poll.id,
      message_id: messageId,
      question: poll.question,
      created_by: poll.created_by,
      created_at: poll.created_at,
      total_votes: pollVotes.length,
      options: pollOptions.map((option) => ({
        id: option.id,
        poll_id: option.poll_id,
        body: option.body,
        position: option.position,
        vote_count: votesByOptionId[option.id] ?? 0,
        is_selected_by_current_user: currentUserVote?.option_id === option.id,
      })),
    };

    return pollsByMessageId;
  }, {});
}

export async function fetchPinnedMessagesForMessages(
  kind: ChatKind,
  messageIds: string[],
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (messageIds.length === 0) {
    return [] as ChatPinnedMessage[];
  }

  const messageColumn = getMessageColumn(kind);
  const { data, error } = await supabase
    .from("chat_pinned_messages")
    .select("*")
    .in(messageColumn, messageIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ChatPinnedMessageRow[])
    .map((pinnedMessage) => {
      const messageId = getPinnedMessageId(kind, pinnedMessage);

      if (!messageId) {
        return null;
      }

      return {
        id: pinnedMessage.id,
        message_id: messageId,
        pinned_by: pinnedMessage.pinned_by,
        created_at: pinnedMessage.created_at,
      } satisfies ChatPinnedMessage;
    })
    .filter(
      (pinnedMessage): pinnedMessage is ChatPinnedMessage =>
        pinnedMessage !== null,
    );
}

export async function createChatPoll(
  kind: ChatKind,
  chatId: string,
  question: string,
  options: string[],
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const rpcName =
    kind === "direct" ? "create_direct_chat_poll" : "create_community_chat_poll";
  const args =
    kind === "direct"
      ? {
          conversation_id_input: chatId,
          question_input: question,
          option_inputs: options,
        }
      : {
          community_id_input: chatId,
          question_input: question,
          option_inputs: options,
        };
  const { data, error } = await supabase.rpc(rpcName, args);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function voteChatPoll(pollId: string, optionId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.rpc("vote_chat_poll", {
    poll_id_input: pollId,
    option_id_input: optionId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setChatMessagePinned(
  kind: ChatKind,
  messageId: string,
  pinned: boolean,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const rpcName =
    kind === "direct"
      ? pinned
        ? "pin_direct_chat_message"
        : "unpin_direct_chat_message"
      : pinned
        ? "pin_community_chat_message"
        : "unpin_community_chat_message";
  const { error } = await supabase.rpc(rpcName, {
    message_id_input: messageId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToChatFeatureChanges(
  kind: ChatKind,
  chatId: string,
  onChange: () => void,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const supabaseClient = supabase;
  const channelId = `${kind}:${chatId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  const channel = supabaseClient
    .channel(`chat-features:${channelId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_polls" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_poll_options" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_poll_votes" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_pinned_messages" },
      onChange,
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}
