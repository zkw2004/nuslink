import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const PREDEFINED_INTERESTS = [
  "AI / ML",
  "Systems",
  "Theory & Algos",
  "Security",
  "Data Science",
  "HCI / Design",
  "Web & Mobile",
  "Computer Vision",
  "NLP",
  "Graphics",
  "Robotics",
  "Fintech",
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

export default function InterestsScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  function toggleInterest(interest: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });
  }

  function addCustomTag() {
    const tag = customInput.trim();
    if (!tag || customTags.includes(tag) || PREDEFINED_INTERESTS.includes(tag)) return;
    setCustomTags((prev) => [...prev, tag]);
    setSelected((prev) => new Set([...prev, tag]));
    setCustomInput("");
    setShowCustomInput(false);
  }

  const canContinue = selected.size >= 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Progress bar */}
      <View className="flex-row gap-1 px-5 pt-3 pb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i < CURRENT_STEP ? "bg-primary" : "bg-gray-200"
            }`}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1 px-6 pt-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
          What are you into?
        </Text>
        <Text className="mt-2 text-[15px] text-gray-500 leading-snug">
          Pick the areas you care about. Matches surface peers who overlap.
        </Text>

        <View className="flex-row flex-wrap gap-2 mt-6">
          {[...PREDEFINED_INTERESTS, ...customTags].map((interest) => {
            const isSelected = selected.has(interest);
            return (
              <TouchableOpacity
                key={interest}
                onPress={() => toggleInterest(interest)}
                activeOpacity={0.75}
                className={`px-4 py-2 rounded-full border ${
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-gray-100 border-transparent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? "text-white" : "text-gray-700"
                  }`}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}

          {showCustomInput ? (
            <View className="flex-row items-center px-3 py-1.5 rounded-full border border-gray-300 bg-white">
              <TextInput
                autoFocus
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={addCustomTag}
                onBlur={() => {
                  if (!customInput.trim()) setShowCustomInput(false);
                }}
                placeholder="Add tag…"
                returnKeyType="done"
                className="text-sm text-gray-700 min-w-[90px]"
              />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowCustomInput(true)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1 px-4 py-2 rounded-full border border-dashed border-gray-300"
            >
              <Text className="text-sm text-gray-400">+ Custom</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tip card */}
        <View className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex-row gap-3 items-start">
          <Text className="text-primary text-base mt-0.5">✦</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">
              You can add custom tags later
            </Text>
            <Text className="text-xs text-gray-500 mt-1 leading-relaxed">
              Niche interests like "competitive programming" or "embedded
              systems" help with hackathon matching.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="px-5 pb-8 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-400 text-center mb-3">
          {selected.size} selected · pick at least 1
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(onboarding)/intent")}
          disabled={!canContinue}
          activeOpacity={0.85}
          className={`py-4 rounded-2xl items-center ${
            canContinue ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              canContinue ? "text-white" : "text-gray-400"
            }`}
          >
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
