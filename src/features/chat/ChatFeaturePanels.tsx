import { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppButton, SectionCard } from "@components/shared";
import type { ChatPinnedMessage, ChatPoll } from "@appTypes/index";

export type PinnedMessagePreview = ChatPinnedMessage & {
  body: string;
  senderName: string;
};

type ChatPollCardProps = {
  poll: ChatPoll;
  disabled?: boolean;
  isDark?: boolean;
  onVote: (optionId: string) => void;
};

type PollComposerProps = {
  question: string;
  options: string[];
  isCreating: boolean;
  onQuestionChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

type PinnedMessagesDrawerProps = {
  pinnedMessages: PinnedMessagePreview[];
  onUnpin: (messageId: string) => void;
};

export function ChatPollCard({
  poll,
  disabled = false,
  isDark = false,
  onVote,
}: ChatPollCardProps) {
  return (
    <View
      className={`rounded-[16px] border px-3 py-3 ${
        isDark ? "border-[#303744] bg-[#20242B]" : "border-[#E4E9F1] bg-[#F7F9FC]"
      }`}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <SymbolView
          name={{ ios: "chart.bar.doc.horizontal", android: "poll", web: "poll" }}
          size={18}
          tintColor={isDark ? "#FFFFFF" : "#0F1115"}
        />
        <Text
          className={`flex-1 text-[13px] font-bold ${
            isDark ? "text-white" : "text-[#0F1115]"
          }`}
        >
          {poll.question}
        </Text>
      </View>

      <View className="gap-2">
        {poll.options.map((option) => {
          const percentage =
            poll.total_votes > 0
              ? Math.round((option.vote_count / poll.total_votes) * 100)
              : 0;

          return (
            <Pressable
              key={option.id}
              disabled={disabled}
              onPress={() => onVote(option.id)}
              className={`rounded-[14px] border px-3 py-3 ${
                option.is_selected_by_current_user
                  ? isDark
                    ? "border-white bg-[#303744]"
                    : "border-[#0F1115] bg-white"
                  : isDark
                    ? "border-[#303744] bg-[#171B22]"
                    : "border-[#E4E9F1] bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text
                  className={`flex-1 text-[13px] font-semibold ${
                    isDark ? "text-white" : "text-[#0F1115]"
                  }`}
                >
                  {option.body}
                </Text>
                <Text
                  className={`text-[12px] font-bold ${
                    isDark ? "text-[#C9D0DB]" : "text-[#5C6370]"
                  }`}
                >
                  {percentage}%
                </Text>
              </View>
              <View
                className={`mt-2 h-[5px] overflow-hidden rounded-full ${
                  isDark ? "bg-[#303744]" : "bg-[#E4E9F1]"
                }`}
              >
                <View
                  className={`h-full rounded-full ${
                    isDark ? "bg-white" : "bg-[#0F1115]"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text className={`mt-3 text-[11px] ${isDark ? "text-[#C9D0DB]" : "text-[#7B8494]"}`}>
        {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

export function PollComposer({
  question,
  options,
  isCreating,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCancel,
  onSubmit,
}: PollComposerProps) {
  return (
    <View className="mb-3 rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] p-3">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="text-[14px] font-bold text-[#0F1115]">Create poll</Text>
        <Pressable
          onPress={onCancel}
          className="h-8 w-8 items-center justify-center rounded-full bg-white"
        >
          <SymbolView name="xmark" size={13} tintColor="#0F1115" />
        </Pressable>
      </View>

      <TextInput
        value={question}
        onChangeText={onQuestionChange}
        placeholder="Poll question"
        placeholderTextColor="#9AA0AB"
        className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3 text-[14px] text-[#0F1115]"
      />

      <View className="mt-3 gap-2">
        {options.map((option, index) => (
          <View key={`poll-option-${index}`} className="flex-row items-center gap-2">
            <TextInput
              value={option}
              onChangeText={(value) => onOptionChange(index, value)}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor="#9AA0AB"
              className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3 text-[14px] text-[#0F1115]"
            />
            {options.length > 2 ? (
              <Pressable
                onPress={() => onRemoveOption(index)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <SymbolView name="minus" size={14} tintColor="#0F1115" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          disabled={options.length >= 6}
          onPress={onAddOption}
          className="h-11 flex-1 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-[13px] font-semibold text-[#0F1115]">
            Add option
          </Text>
        </Pressable>
        <View className="flex-1">
          <AppButton
            label={isCreating ? "Creating..." : "Post poll"}
            disabled={isCreating}
            onPress={onSubmit}
          />
        </View>
      </View>
    </View>
  );
}

export function PinnedMessagesDrawer({
  pinnedMessages,
  onUnpin,
}: PinnedMessagesDrawerProps) {
  const title = useMemo(() => {
    if (pinnedMessages.length === 0) {
      return "Pinned messages";
    }

    return `${pinnedMessages.length} pinned message${
      pinnedMessages.length === 1 ? "" : "s"
    }`;
  }, [pinnedMessages.length]);

  return (
    <SectionCard className="mx-5 mb-4">
      <Text className="text-[15px] font-bold text-[#0F1115]">{title}</Text>
      {pinnedMessages.length === 0 ? (
        <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
          Pin useful decisions, links, and polls from the message actions.
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {pinnedMessages.map((message) => (
            <View
              key={message.id}
              className="rounded-[14px] border border-[#E4E9F1] bg-[#F7F9FC] p-3"
            >
              <Text className="text-[12px] font-semibold text-[#7B8494]">
                {message.senderName}
              </Text>
              <Text className="mt-1 text-[14px] leading-6 text-[#0F1115]">
                {message.body}
              </Text>
              <Pressable
                onPress={() => onUnpin(message.message_id)}
                className="mt-3 self-start rounded-full bg-white px-3 py-2"
              >
                <Text className="text-[12px] font-semibold text-[#0F1115]">
                  Unpin
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
