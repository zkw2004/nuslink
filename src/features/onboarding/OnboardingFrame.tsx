import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OnboardingFrameProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  step: number;
  title: string;
  subtitle: string;
  backHref?: string;
  onBack?: () => void;
};

const TOTAL_STEPS = 5;

export function OnboardingFrame({
  children,
  footer,
  step,
  title,
  subtitle,
  backHref,
  onBack,
}: OnboardingFrameProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#EEF3F9]">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={16}
          className="h-11 w-11 items-center justify-center rounded-full"
          onPress={() => {
            if (onBack) {
              onBack();
              return;
            }
            if (backHref) {
              router.replace(backHref as never);
              return;
            }
            router.replace("/(auth)/sign-in" as never);
          }}
        >
          <Text className="text-[22px] text-gray-500">‹</Text>
        </Pressable>

        <View className="flex-1 flex-row gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index < step ? "bg-[#0F1115]" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[30px] font-bold leading-tight tracking-tight text-gray-900">
          {title}
        </Text>
        <Text className="mt-2 text-[15px] leading-snug text-gray-500">
          {subtitle}
        </Text>

        <View className="mt-7">{children}</View>
      </ScrollView>

      <View className="border-t border-[#E4E9F1] px-5 pb-8 pt-3">{footer}</View>
    </SafeAreaView>
  );
}
