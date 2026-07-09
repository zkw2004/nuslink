import { Pressable, Text, TextInput, View } from "react-native";

type ProfileTagEditorProps = {
  title: string;
  description?: string;
  selectedTags: string[];
  optionTags: readonly string[];
  customInput: string;
  customPlaceholder: string;
  onCustomInputChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onAddCustomTag: () => void;
  onRemoveCustomTag: (tag: string) => void;
  suggestions?: string[];
  suggestionTitle?: string;
  onApplySuggestion?: (tag: string) => void;
};

export function ProfileTagEditor({
  title,
  description,
  selectedTags,
  optionTags,
  customInput,
  customPlaceholder,
  onCustomInputChange,
  onToggleTag,
  onAddCustomTag,
  onRemoveCustomTag,
  suggestions = [],
  suggestionTitle = "Similar existing tags",
  onApplySuggestion,
}: ProfileTagEditorProps) {
  const knownTags = new Set(optionTags);
  const visibleOptions = Array.from(new Set([...optionTags, ...selectedTags]));
  const customSelectedTags = selectedTags.filter((tag) => !knownTags.has(tag));

  return (
    <View>
      <Text className="text-[13px] font-semibold text-[#0F1115]">{title}</Text>
      {description ? (
        <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
          {description}
        </Text>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-2">
        {visibleOptions.map((tag) => {
          const isSelected = selectedTags.includes(tag);

          return (
            <Pressable
              key={tag}
              className={`rounded-full border px-4 py-2 ${
                isSelected
                  ? "border-[#0F1115] bg-[#0F1115]"
                  : "border-[#E4E9F1] bg-white"
              }`}
              onPress={() => onToggleTag(tag)}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  isSelected ? "text-white" : "text-[#5C6370]"
                }`}
              >
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          value={customInput}
          onChangeText={onCustomInputChange}
          className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
          placeholder={customPlaceholder}
          placeholderTextColor="#9AA0AB"
        />
        <Pressable
          className="rounded-full bg-[#0F1115] px-4 py-3"
          onPress={onAddCustomTag}
        >
          <Text className="text-[13px] font-semibold text-white">Add</Text>
        </Pressable>
      </View>

      {customSelectedTags.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {customSelectedTags.map((tag) => (
            <Pressable
              key={tag}
              className="rounded-full border border-[#E4E9F1] bg-white px-3 py-2"
              onPress={() => onRemoveCustomTag(tag)}
            >
              <Text className="text-[13px] font-medium text-[#5C6370]">
                {tag} ×
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {suggestions.length > 0 && onApplySuggestion ? (
        <View className="mt-3">
          <Text className="mb-2 text-[12px] font-semibold uppercase tracking-[0.5px] text-[#7A8594]">
            {suggestionTitle}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                className="rounded-full border border-[#D0D7E2] bg-white px-4 py-2"
                onPress={() => onApplySuggestion(suggestion)}
              >
                <Text className="text-[13px] font-semibold text-[#415A77]">
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
