import { useState } from "react";
import {
  Pressable,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore, useOnboardingStore } from "@store/index";

const PREDEFINED_INTERESTS = [
  "AI / ML",
  "Software Engineering",
  "Data Science",
  "Economics",
  "Finance",
  "Consulting",
  "Entrepreneurship",
  "Design",
  "Public Policy",
  "Operations",
  "Marketing",
  "Research",
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;

export default function InterestsScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const savedInterests = useOnboardingStore((state) => state.interests);
  const setInterests = useOnboardingStore((state) => state.setInterests);
  const initialInterests =
    savedInterests.length > 0 ? savedInterests : (profile?.interests ?? []);
  const initialCustomTags = initialInterests.filter(
    (interest) => !PREDEFINED_INTERESTS.includes(interest),
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialInterests),
  );
  const [customTags, setCustomTags] = useState<string[]>(initialCustomTags);
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
    <SafeAreaView className="flex-1 bg-[#EEF3F9]">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={() => router.replace("/(onboarding)/profile-setup")}
        >
          <Text className="text-[22px] text-gray-500">‹</Text>
        </Pressable>
        <View className="flex-1 flex-row gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < CURRENT_STEP ? "bg-[#0F1115]" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
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
          Choose the academic and professional areas you care about right now.
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
                    ? "bg-[#0F1115] border-[#0F1115]"
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
        <View className="mt-6 p-4 bg-[#E7EEF7] rounded-2xl border border-[#D0D7E2] flex-row gap-3 items-start">
          <Text className="text-[#5B7BA3] text-base mt-0.5">✦</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">
              You can add custom tags later
            </Text>
            <Text className="text-xs text-gray-500 mt-1 leading-relaxed">
              Mix broad areas like finance, consulting, policy, or entrepreneurship
              with technical interests if they matter to you.
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
          onPress={() => {
            setInterests(Array.from(selected));
            router.push("/(onboarding)/intent");
          }}
          disabled={!canContinue}
          activeOpacity={0.85}
          className={`py-4 rounded-2xl items-center ${
            canContinue ? "bg-[#0F1115]" : "bg-gray-200"
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
