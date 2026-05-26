import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppChip,
  AppScreenHeader,
  SectionCard,
  SectionHeader,
} from "@components/shared";
import { searchNusmodsModules } from "@lib/nusmods";
import { useAuthStore, useGroupsStore } from "@store/index";
import { toSelectedModule, type SelectedModule } from "@features/onboarding/types";

const groupTypes = [
  { label: "Study group", value: "study_group" },
  { label: "Hackathon team", value: "hackathon_team" },
  { label: "Project team", value: "project_team" },
  { label: "Tutoring session", value: "tutoring_session" },
] as const;

export default function CreateScreen() {
  const session = useAuthStore((state) => state.session);
  const createGroup = useGroupsStore((state) => state.createGroup);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupType, setSelectedGroupType] = useState<string | null>(
    "study_group",
  );
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<SelectedModule | null>(null);
  const [moduleResults, setModuleResults] = useState<SelectedModule[]>([]);
  const [isSearchingModules, setIsSearchingModules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    const query = moduleQuery.trim();

    if (selectedModule && query.toUpperCase() === selectedModule.moduleCode) {
      setModuleResults([]);
      setIsSearchingModules(false);
      return;
    }

    if (query.length < 2) {
      setModuleResults([]);
      setIsSearchingModules(false);
      return;
    }

    setIsSearchingModules(true);

    const timeoutId = setTimeout(() => {
      void searchNusmodsModules(query)
        .then((modules) => {
          if (!isActive) {
            return;
          }

          setModuleResults(modules.map(toSelectedModule));
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setModuleResults([]);
        })
        .finally(() => {
          if (isActive) {
            setIsSearchingModules(false);
          }
        });
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [moduleQuery, selectedModule]);

  const canCreate = useMemo(() => {
    return (
      groupName.trim().length > 0 &&
      selectedGroupType !== null &&
      selectedModule !== null
    );
  }, [groupName, selectedGroupType, selectedModule]);

  function handleSelectModule(module: SelectedModule) {
    setSelectedModule(module);
    setModuleQuery(module.moduleCode);
    setModuleResults([]);
  }

  async function handleCreateGroup() {
    if (!session?.user || !selectedGroupType) {
      Alert.alert("Sign in required", "Please sign in again before creating a group.");
      return;
    }

    if (!selectedModule) {
      Alert.alert("Choose a module", "Search NUSMods and choose a module before creating the group.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createGroup({
        creatorId: session.user.id,
        module: {
          code: selectedModule.moduleCode,
          name: selectedModule.title,
          faculty: selectedModule.faculty,
          department: selectedModule.department,
        },
        name: groupName,
        type: selectedGroupType as
          | "study_group"
          | "hackathon_team"
          | "project_team"
          | "tutoring_session",
      });
      setGroupName("");
      setModuleQuery("");
      setSelectedModule(null);
      router.replace("/(tabs)/discover");
    } catch (error) {
      Alert.alert(
        "Could not create group",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Create Group"
        subtitle="Create a public study or project group. Search real modules from NUSMods for the current semester."
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <SectionHeader title="Group Name" />
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. CS2040S Midterm Prep"
            placeholderTextColor="#9B8C7D"
            className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
          />
          <Text className="mt-2 text-[12px] text-[#9AA0AB]">
            Keep it clear and easy to scan in Discover.
          </Text>
        </SectionCard>

        <SectionCard className="mb-4">
          <SectionHeader title="Group Type" />
          <View className="flex-row flex-wrap gap-2">
            {groupTypes.map((groupType) => {
              const isSelected = selectedGroupType === groupType.value;

              return (
                <Pressable
                  key={groupType.value}
                  onPress={() => setSelectedGroupType(groupType.value)}
                  className={`rounded-full border px-4 py-3 ${
                    isSelected
                      ? "border-[#0F1115] bg-[#0F1115]"
                      : "border-[#E4E9F1] bg-white"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      isSelected ? "text-white" : "text-[#5C6370]"
                    }`}
                  >
                    {groupType.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard className="mb-4">
          <SectionHeader title="Module" />
          <TextInput
            value={moduleQuery}
            onChangeText={(nextValue) => {
              setModuleQuery(nextValue.toUpperCase());
              if (selectedModule && nextValue.toUpperCase() !== selectedModule.moduleCode) {
                setSelectedModule(null);
              }
            }}
            autoCapitalize="characters"
            placeholder="Search NUSMods e.g. CS2040S"
            placeholderTextColor="#9B8C7D"
            className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] uppercase text-[#0F1115]"
          />

          <Text className="mt-2 text-[12px] text-[#9AA0AB]">
            Search live NUSMods data and pick the exact module before creating the group.
          </Text>

          {isSearchingModules ? (
            <View className="mt-3 items-start">
              <ActivityIndicator color="#5B7BA3" />
            </View>
          ) : null}

          {moduleResults.length > 0 ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-[#E4E9F1]">
              {moduleResults.map((module) => (
                <Pressable
                  key={module.moduleCode}
                  className="border-b border-[#EEF2F7] bg-white px-4 py-3"
                  onPress={() => handleSelectModule(module)}
                >
                  <Text className="text-sm font-bold text-[#0F1115]">
                    {module.moduleCode}
                  </Text>
                  <Text className="mt-1 text-xs leading-4 text-[#5C6370]">
                    {module.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {selectedModule ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              <AppChip label={selectedModule.moduleCode} variant="module" />
              <AppChip label={selectedModule.title} variant="outline" />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard className="mb-5">
          <SectionHeader title="Privacy" />
          <View className="rounded-[14px] bg-[#E7EEF7] px-4 py-4">
            <Text className="text-[14px] font-semibold text-[#0F1115]">
              Public groups only in M1
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-[#5C6370]">
              Anyone using the app can discover and join this group. Semi-private
              and private flows are intentionally deferred to a later milestone.
            </Text>
          </View>
        </SectionCard>

        <View className="mb-3 flex-row flex-wrap gap-2">
          <AppChip label="Manual flow" />
          <AppChip label="NUSMods search" variant="outline" />
          <AppChip label="No AI autofill yet" variant="outline" />
        </View>

        <AppButton
          label={isSubmitting ? "Creating..." : "Create public group"}
          disabled={!canCreate || isSubmitting}
          onPress={() => {
            void handleCreateGroup();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
