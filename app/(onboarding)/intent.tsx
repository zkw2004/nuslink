import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Intent } from "@appTypes/index";

const INTENTS: { id: Intent; label: string; desc: string }[] = [
  {
    id: "study_group",
    label: "Study groups",
    desc: "Find module-mates for revision, problem sets, projects.",
  },
  {
    id: "hackathon",
    label: "Hackathons / comps",
    desc: "Build teams with complementary skills.",
  },
  {
    id: "tutoring",
    label: "Tutoring / TA",
    desc: "Offer help to juniors or find a tutor.",
  },
  {
    id: "internship_networking",
    label: "Internship networking",
    desc: "Connect with seniors and industry-bound peers.",
  },
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

export default function IntentScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<Intent>>(new Set());

  function toggleIntent(id: Intent) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      >
        <Text className="text-[30px] font-bold text-gray-900 tracking-tight leading-tight">
          What brings you here?
        </Text>
        <Text className="mt-2 text-[15px] text-gray-500 leading-snug">
          Multi-select. This shapes which matches we surface first — you'll still
          see everything.
        </Text>

        <View className="mt-6 gap-3">
          {INTENTS.map(({ id, label, desc }) => {
            const isSelected = selected.has(id);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => toggleIntent(id)}
                activeOpacity={0.8}
                className={`flex-row items-center gap-4 p-4 rounded-2xl border-[1.5px] ${
                  isSelected
                    ? "bg-orange-50 border-primary"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full border-[1.5px] items-center justify-center ${
                    isSelected ? "bg-primary border-primary" : "border-gray-400"
                  }`}
                >
                  {isSelected && (
                    <Text className="text-white text-[11px] font-bold leading-none">
                      ✓
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    {label}
                  </Text>
                  <Text className="text-[13px] text-gray-500 mt-0.5 leading-snug">
                    {desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="px-5 pb-8 pt-3 border-t border-gray-100">
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/discover")}
          activeOpacity={0.85}
          className="bg-primary py-4 rounded-2xl items-center"
        >
          <Text className="text-white text-base font-semibold">
            Let's go →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
