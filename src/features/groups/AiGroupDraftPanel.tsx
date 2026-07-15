import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { SectionCard, SectionHeader } from "@components/shared";
import {
  draftGroupFromPrompt,
  type GroupDraft,
} from "@services/groupDraftingService";

type AiGroupDraftPanelProps = {
  onDraftReady: (draft: GroupDraft) => void | Promise<void>;
};

const EXAMPLE_PROMPT =
  "CS2040S study group before midterms, 3 to 5 people at COM3.";

export function AiGroupDraftPanel({ onDraftReady }: AiGroupDraftPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  async function handleDraft() {
    const normalizedPrompt = prompt.trim();

    if (normalizedPrompt.length < 10) {
      Alert.alert(
        "Add a little more detail",
        "Describe the group, module, and anything else you already know.",
      );
      return;
    }

    setIsDrafting(true);
    try {
      const draft = await draftGroupFromPrompt(normalizedPrompt);
      await onDraftReady(draft);
    } catch (error) {
      Alert.alert(
        "Could not draft the group",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsDrafting(false);
    }
  }

  return (
    <SectionCard className="mb-4 border-[#C9D8EA] bg-[#F7FAFE]">
      <SectionHeader title="Describe your group" />
      <Text className="mb-3 text-[13px] leading-5 text-[#5C6370]">
        AI fills a draft only. Review every field before you create the group.
      </Text>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        multiline
        textAlignVertical="top"
        maxLength={1000}
        editable={!isDrafting}
        placeholder={EXAMPLE_PROMPT}
        placeholderTextColor="#8B96A5"
        className="min-h-[116px] rounded-[14px] border border-[#D7E2EF] bg-white px-4 py-3 text-[15px] leading-6 text-[#0F1115]"
      />
      <View className="mt-2 flex-row items-center justify-between gap-3">
        <Text className="text-[11px] text-[#9AA0AB]">
          {prompt.length}/1000
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate group draft"
          disabled={isDrafting || prompt.trim().length < 10}
          onPress={() => {
            void handleDraft();
          }}
          className={`rounded-full px-5 py-3 ${
            isDrafting || prompt.trim().length < 10
              ? "bg-[#B8C1CC]"
              : "bg-[#315E8A]"
          }`}
        >
          <Text className="text-[13px] font-bold text-white">
            {isDrafting ? "Drafting..." : "Fill form with AI"}
          </Text>
        </Pressable>
      </View>
    </SectionCard>
  );
}
