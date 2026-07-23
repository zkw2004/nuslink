import { Switch, Text, View } from "react-native";

import { GlassSurface } from "@components/shared";
import type { NudgePreferences } from "@appTypes/index";

const OPTIONS = [
  {
    key: "time_enabled",
    title: "Time-based nudges",
    description: "Semester check-ins tied to your current modules.",
  },
  {
    key: "behaviour_enabled",
    title: "Behaviour-based nudges",
    description: "Helpful next steps when setup or group activity stalls.",
  },
  {
    key: "network_enabled",
    title: "Network-based nudges",
    description: "Updates when your connections share current modules.",
  },
] as const;

export function NudgePreferencesCard({
  disabled,
  onChange,
  preferences,
}: {
  disabled: boolean;
  onChange: (preferences: NudgePreferences) => void;
  preferences: NudgePreferences;
}) {
  return (
    <GlassSurface
      tint="light"
      radius={22}
      intensity={35}
      style={{ width: "100%" }}
    >
      <View className="gap-1 p-[18px]">
        <Text className="text-[11px] font-bold tracking-[0.6px] text-[#7A7A8C]">
          SMART NUDGES
        </Text>
        <Text className="mb-2 text-[13px] leading-[19px] text-[#6E6E80]">
          Choose which contextual suggestions can appear in your notification
          feed.
        </Text>

        {OPTIONS.map((option, index) => (
          <View
            key={option.key}
            className={`flex-row items-center gap-4 py-4 ${
              index < OPTIONS.length - 1 ? "border-b border-[#E1E4EC]" : ""
            }`}
          >
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-[#22222E]">
                {option.title}
              </Text>
              <Text className="mt-1 text-[12.5px] leading-[18px] text-[#6E6E80]">
                {option.description}
              </Text>
            </View>
            <Switch
              accessibilityLabel={option.title}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ ...preferences, [option.key]: value })
              }
              thumbColor="#FFFFFF"
              trackColor={{ false: "#CDD2DE", true: "#5B4FE0" }}
              value={preferences[option.key]}
            />
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}
