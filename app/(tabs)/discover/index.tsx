import { useEffect, useMemo } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppChip,
  AppScreenHeader,
  SectionCard,
} from "@components/shared";
import { useAuthStore, useGroupsStore } from "@store/index";

function formatGroupTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function DiscoverScreen() {
  const session = useAuthStore((state) => state.session);
  const groups = useGroupsStore((state) => state.groups);
  const isLoading = useGroupsStore((state) => state.isLoading);
  const error = useGroupsStore((state) => state.error);
  const joinGroup = useGroupsStore((state) => state.joinGroup);
  const refreshGroups = useGroupsStore((state) => state.refreshGroups);

  useEffect(() => {
    void refreshGroups(session?.user.id ?? null);
  }, [refreshGroups, session?.user.id]);

  const titleCopy = useMemo(() => {
    if (isLoading) {
      return "Loading public groups...";
    }

    if (groups.length === 0) {
      return "No public groups yet";
    }

    return `${groups.length} public group${groups.length === 1 ? "" : "s"} this semester`;
  }, [groups.length, isLoading]);

  async function handleJoinGroup(groupId: string) {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in again before joining a group.");
      return;
    }

    try {
      await joinGroup(groupId, session.user.id);
    } catch (joinError) {
      Alert.alert(
        "Could not join group",
        joinError instanceof Error ? joinError.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader title="Discover" subtitle="Browse and join public groups for the current semester." />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
          {titleCopy}
        </Text>

        {error ? (
          <SectionCard className="mb-4">
            <Text className="text-sm leading-6 text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        {groups.length === 0 && !isLoading ? (
          <SectionCard>
            <Text className="text-[17px] font-bold text-[#0F1115]">No public groups yet</Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              Create the first public group for your modules, project team, or revision circle.
            </Text>
          </SectionCard>
        ) : null}

        <View className="gap-4">
          {groups.map((group) => (
            <SectionCard key={group.id} className="overflow-hidden rounded-[20px] p-0">
              <View className="gap-3 p-[16px]">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[18px] font-bold tracking-[-0.4px] text-[#0F1115]">
                      {group.name}
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                      {group.description?.trim() || "Public group open to module-mates and peers this semester."}
                    </Text>
                  </View>
                  <AppChip label={formatGroupTypeLabel(group.type)} variant="module" />
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {group.module_code ? (
                    <AppChip label={group.module_code} variant="outline" />
                  ) : null}
                  <AppChip label="Public group" variant="outline" />
                  {group.joined ? <AppChip label="Joined" variant="solid" /> : null}
                </View>
              </View>

              <View className="flex-row items-center gap-[10px] border-t border-[#E4E9F1] bg-[#EEF2F7] px-[16px] py-[12px]">
                <Text className="flex-1 text-[12px] text-[#5C6370]">
                  {group.joined ? "You are already in this group." : "Open for students in the same semester."}
                </Text>

                <View className="min-w-[104px]">
                  <AppButton
                    label={group.joined ? "Joined" : "Join group"}
                    disabled={group.joined}
                    onPress={() => {
                      void handleJoinGroup(group.id);
                    }}
                  />
                </View>
              </View>
            </SectionCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
