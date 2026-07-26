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
import { ModerationAlert } from "@components/moderation";
import { getCurrentSemester, searchNusmodsModules } from "@lib/nusmods";
import { useAuthStore, useCommunitiesStore, useGroupsStore } from "@store/index";
import { toSelectedModule, type SelectedModule } from "@features/onboarding/types";
import { AiGroupDraftPanel } from "@features/groups/AiGroupDraftPanel";
import type { GroupDraft } from "@services/groupDraftingService";
import {
  checkContentBatch,
  confirmFlaggedContent,
  getAggregateModerationVerdict,
  hasBlockedModeration,
  hasFlaggedModeration,
} from "@services/moderationService";
import type { Database } from "@appTypes/database";

type CreateMode = "group" | "community";
type GroupEntryMode = "manual" | "ai";
type GroupType = Database["public"]["Tables"]["groups"]["Row"]["type"];
type PrivacySetting = Database["public"]["Tables"]["groups"]["Row"]["privacy"];
type SemiPrivateRestriction =
  Database["public"]["Tables"]["groups"]["Row"]["restriction"];
type CommunityJoinPolicy =
  Database["public"]["Tables"]["communities"]["Row"]["join_policy"];

const createModes: { label: string; value: CreateMode }[] = [
  { label: "Group", value: "group" },
  { label: "Community", value: "community" },
];

const groupTypes = [
  { label: "Study group", value: "study_group" },
  { label: "Hackathon team", value: "hackathon_team" },
  { label: "Project team", value: "project_team" },
  { label: "Tutoring session", value: "tutoring_session" },
] as const;

const privacyOptions: { label: string; value: PrivacySetting; helper: string }[] = [
  {
    label: "Public",
    value: "public",
    helper: "Visible and joinable by any signed-in user.",
  },
  {
    label: "Semi-private",
    value: "semi_private",
    helper: "Visible to everyone, joinable only by students who meet a rule.",
  },
  {
    label: "Private",
    value: "private",
    helper: "Visible as a limited card. Owners invite connections or approve requests.",
  },
];

const restrictionOptions: {
  label: string;
  value: NonNullable<SemiPrivateRestriction>;
}[] = [
  { label: "Same module", value: "same_module" },
  { label: "Same year", value: "same_year" },
  { label: "Same faculty", value: "same_faculty" },
];

const communityPrivacyOptions: {
  label: string;
  value: CommunityJoinPolicy;
  helper: string;
}[] = [
  {
    label: "Open join",
    value: "open",
    helper: "Any signed-in student can join immediately from Discover.",
  },
  {
    label: "Approval required",
    value: "request_approval",
    helper: "Visible in Discover now, with a moderation step supported later.",
  },
];

function parseOptionalSize(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, " ");
}

export default function CreateScreen() {
  const session = useAuthStore((state) => state.session);
  const createGroup = useGroupsStore((state) => state.createGroup);
  const createCommunity = useCommunitiesStore((state) => state.createCommunity);
  const [createMode, setCreateMode] = useState<CreateMode>("group");
  const [groupEntryMode, setGroupEntryMode] = useState<GroupEntryMode>("manual");

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [selectedGroupType, setSelectedGroupType] =
    useState<GroupType>("study_group");
  const [selectedPrivacy, setSelectedPrivacy] =
    useState<PrivacySetting>("public");
  const [selectedRestriction, setSelectedRestriction] =
    useState<NonNullable<SemiPrivateRestriction>>("same_module");
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<SelectedModule | null>(null);
  const [moduleResults, setModuleResults] = useState<SelectedModule[]>([]);
  const [isSearchingModules, setIsSearchingModules] = useState(false);

  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityTags, setCommunityTags] = useState<string[]>([]);
  const [communityTagInput, setCommunityTagInput] = useState("");
  const [communityPrivacy, setCommunityPrivacy] =
    useState<CommunityJoinPolicy>("open");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModerationAlertVisible, setIsModerationAlertVisible] = useState(false);
  const currentSemester = useMemo(() => getCurrentSemester(), []);

  useEffect(() => {
    let isActive = true;
    const query = moduleQuery.trim();

    if (createMode !== "group") {
      setModuleResults([]);
      setIsSearchingModules(false);
      return;
    }

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
  }, [createMode, moduleQuery, selectedModule]);

  const canCreateGroup = useMemo(() => {
    return groupName.trim().length > 0 && selectedModule !== null;
  }, [groupName, selectedModule]);

  const canCreateCommunity = useMemo(() => {
    return communityName.trim().length > 0;
  }, [communityName]);

  function handleSelectModule(module: SelectedModule) {
    setSelectedModule(module);
    setModuleQuery(module.moduleCode);
    setModuleResults([]);
  }

  async function handleDraftReady(draft: GroupDraft) {
    if (draft.name) {
      setGroupName(draft.name);
    }
    if (draft.description) {
      setDescription(draft.description);
    }
    if (draft.venue) {
      setVenue(draft.venue);
    }
    if (draft.type) {
      setSelectedGroupType(draft.type);
    }
    if (draft.privacy) {
      setSelectedPrivacy(draft.privacy);
    }
    if (draft.restriction) {
      setSelectedRestriction(draft.restriction);
    }
    if (draft.min_size !== null) {
      setMinSize(String(draft.min_size));
    }
    if (draft.max_size !== null) {
      setMaxSize(String(draft.max_size));
    }

    let moduleWasResolved = true;
    if (draft.module_code) {
      setModuleQuery(draft.module_code);
      try {
        const modules = await searchNusmodsModules(draft.module_code);
        const exactModule = modules
          .map(toSelectedModule)
          .find((module) => module.moduleCode === draft.module_code);
        setSelectedModule(exactModule ?? null);
        moduleWasResolved = exactModule !== undefined;
      } catch {
        setSelectedModule(null);
        moduleWasResolved = false;
      }
    }

    Alert.alert(
      "Draft added",
      moduleWasResolved
        ? "Review the suggested fields, complete anything missing, then create the group."
        : "The fields were added, but the suggested module was not found in NUSMods. Choose the module manually before creating the group.",
    );
  }

  function handleAddCommunityTag() {
    const normalizedTag = normalizeTag(communityTagInput);

    if (!normalizedTag) {
      return;
    }

    if (communityTags.some((tag) => tag.toLowerCase() === normalizedTag.toLowerCase())) {
      Alert.alert("Tag already added", "Choose a different tag for this community.");
      return;
    }

    if (communityTags.length >= 6) {
      Alert.alert("Tag limit reached", "Keep communities to at most 6 tags.");
      return;
    }

    setCommunityTags((current) => [...current, normalizedTag.slice(0, 24)]);
    setCommunityTagInput("");
  }

  function removeCommunityTag(tagToRemove: string) {
    setCommunityTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  async function handleCreateGroup() {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in again before creating a group.");
      return;
    }

    if (!selectedModule) {
      Alert.alert(
        "Choose a module",
        "Search NUSMods and choose a module before creating the group.",
      );
      return;
    }

    const parsedMinSize = parseOptionalSize(minSize);
    const parsedMaxSize = parseOptionalSize(maxSize);

    if (
      (minSize.trim() && parsedMinSize === null) ||
      (maxSize.trim() && parsedMaxSize === null)
    ) {
      Alert.alert(
        "Check group size",
        "Minimum and maximum size must be whole numbers.",
      );
      return;
    }

    if (
      parsedMinSize !== null &&
      parsedMaxSize !== null &&
      parsedMinSize > parsedMaxSize
    ) {
      Alert.alert(
        "Check group size",
        "Minimum size cannot be greater than maximum size.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const moderationResults = await checkContentBatch([
        {
          key: "name",
          subjectType: "group_name",
          content: groupName,
          sourceTable: "groups",
          sourceColumn: "name",
        },
        {
          key: "description",
          subjectType: "group_description",
          content: description,
          sourceTable: "groups",
          sourceColumn: "description",
        },
      ]);

      if (hasBlockedModeration(moderationResults)) {
        setIsModerationAlertVisible(true);
        return;
      }

      if (hasFlaggedModeration(moderationResults)) {
        const confirmed = await confirmFlaggedContent(
          "This group may be hidden behind a warning. Do you still want to create it?",
        );
        if (!confirmed) {
          return;
        }
      }

      const result = await createGroup({
        creatorId: session.user.id,
        module: {
          code: selectedModule.moduleCode,
          name: selectedModule.title,
          faculty: selectedModule.faculty,
          department: selectedModule.department,
        },
        name: groupName,
        type: selectedGroupType,
        privacy: selectedPrivacy,
        restriction:
          selectedPrivacy === "semi_private" ? selectedRestriction : null,
        semester: currentSemester.semester,
        description,
        minSize: parsedMinSize,
        maxSize: parsedMaxSize,
        venue,
        moderationOutcome: getAggregateModerationVerdict(moderationResults),
      });

      setGroupName("");
      setDescription("");
      setVenue("");
      setMinSize("");
      setMaxSize("");
      setModuleQuery("");
      setSelectedModule(null);

      if (result.inviteCode) {
        Alert.alert(
          "Private group created",
          "Invite connected people from Discover, or approve join requests from Notifications.",
          [
            {
              text: "View Discover",
              onPress: () => router.replace("/(tabs)/discover"),
            },
          ],
        );
        return;
      }

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

  async function handleCreateCommunity() {
    if (!session?.user) {
      Alert.alert(
        "Sign in required",
        "Please sign in again before creating a community.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const moderationResults = await checkContentBatch([
        {
          key: "name",
          subjectType: "community_name",
          content: communityName,
          sourceTable: "communities",
          sourceColumn: "name",
        },
        {
          key: "description",
          subjectType: "community_description",
          content: communityDescription,
          sourceTable: "communities",
          sourceColumn: "description",
        },
        ...communityTags.map((tag, index) => ({
          key: `tag-${index}`,
          subjectType: "community_tag" as const,
          content: tag,
          sourceTable: "communities",
          sourceColumn: "tags",
        })),
      ]);

      if (hasBlockedModeration(moderationResults)) {
        setIsModerationAlertVisible(true);
        return;
      }

      if (hasFlaggedModeration(moderationResults)) {
        const confirmed = await confirmFlaggedContent(
          "This community may be hidden behind a warning. Do you still want to create it?",
        );
        if (!confirmed) {
          return;
        }
      }

      await createCommunity({
        userId: session.user.id,
        name: communityName.trim(),
        description: communityDescription.trim(),
        tags: communityTags,
        privacy: communityPrivacy,
        moderationOutcome: getAggregateModerationVerdict(moderationResults),
      });

      setCommunityName("");
      setCommunityDescription("");
      setCommunityTagInput("");
      setCommunityTags([]);
      setCommunityPrivacy("open");
      router.replace("/(tabs)/discover");
    } catch (error) {
      Alert.alert(
        "Could not create community",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isGroupMode = createMode === "group";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title={isGroupMode ? "Create Group" : "Create Community"}
        subtitle={
          isGroupMode
            ? "Create a group for the current semester with public, restricted, or invite-only access."
            : "Create a persistent community space for clubs, interests, and semester-spanning collaboration."
        }
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <View className="flex-row rounded-full bg-[#EEF2F7] p-1">
            {createModes.map((mode) => {
              const isSelected = createMode === mode.value;

              return (
                <Pressable
                  key={mode.value}
                  onPress={() => setCreateMode(mode.value)}
                  className={`flex-1 rounded-full px-4 py-3 ${
                    isSelected ? "bg-[#0F1115]" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-center text-[13px] font-semibold ${
                      isSelected ? "text-white" : "text-[#5C6370]"
                    }`}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {isGroupMode ? (
          <>
            <SectionCard className="mb-4">
              <SectionHeader title="How do you want to start?" />
              <View className="flex-row rounded-full bg-[#EEF2F7] p-1">
                {(
                  [
                    { label: "Manual", value: "manual" },
                    { label: "AI draft", value: "ai" },
                  ] as const
                ).map((mode) => {
                  const isSelected = groupEntryMode === mode.value;

                  return (
                    <Pressable
                      key={mode.value}
                      accessibilityRole="button"
                      onPress={() => setGroupEntryMode(mode.value)}
                      className={`flex-1 rounded-full px-4 py-3 ${
                        isSelected ? "bg-[#315E8A]" : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`text-center text-[13px] font-semibold ${
                          isSelected ? "text-white" : "text-[#5C6370]"
                        }`}
                      >
                        {mode.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>

            {groupEntryMode === "ai" ? (
              <AiGroupDraftPanel onDraftReady={handleDraftReady} />
            ) : null}

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

              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
                placeholder="Optional description"
                placeholderTextColor="#9B8C7D"
                className="mt-3 min-h-[94px] rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3 text-[15px] leading-6 text-[#0F1115]"
              />
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
                  if (
                    selectedModule &&
                    nextValue.toUpperCase() !== selectedModule.moduleCode
                  ) {
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
              <View className="gap-2">
                {privacyOptions.map((option) => {
                  const isSelected = selectedPrivacy === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      className={`rounded-[16px] border px-4 py-3 ${
                        isSelected
                          ? "border-[#0F1115] bg-[#E7EEF7]"
                          : "border-[#E4E9F1] bg-white"
                      }`}
                      onPress={() => setSelectedPrivacy(option.value)}
                    >
                      <Text className="text-[14px] font-bold text-[#0F1115]">
                        {option.label}
                      </Text>
                      <Text className="mt-1 text-[12px] leading-5 text-[#5C6370]">
                        {option.helper}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedPrivacy === "semi_private" ? (
                <View className="mt-4">
                  <Text className="mb-2 text-[13px] font-semibold text-[#5C6370]">
                    Join rule
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {restrictionOptions.map((restriction) => {
                      const isSelected = selectedRestriction === restriction.value;

                      return (
                        <Pressable
                          key={restriction.value}
                          className={`rounded-full border px-4 py-2 ${
                            isSelected
                              ? "border-[#0F1115] bg-[#0F1115]"
                              : "border-[#E4E9F1] bg-white"
                          }`}
                          onPress={() => setSelectedRestriction(restriction.value)}
                        >
                          <Text
                            className={`text-[13px] font-semibold ${
                              isSelected ? "text-white" : "text-[#5C6370]"
                            }`}
                          >
                            {restriction.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard className="mb-5">
              <SectionHeader title="Optional Details" />
              <View className="gap-3">
                <TextInput
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="Venue e.g. COM3 level 2"
                  placeholderTextColor="#9B8C7D"
                  className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                />

                <View className="flex-row gap-3">
                  <TextInput
                    value={minSize}
                    onChangeText={setMinSize}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    placeholder="Min size"
                    placeholderTextColor="#9B8C7D"
                    className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                  />
                  <TextInput
                    value={maxSize}
                    onChangeText={setMaxSize}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    placeholder="Max size"
                    placeholderTextColor="#9B8C7D"
                    className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                  />
                </View>
              </View>
            </SectionCard>

            <View className="mb-3 flex-row flex-wrap gap-2">
              <AppChip
                label={groupEntryMode === "ai" ? "AI-assisted draft" : "Manual flow"}
              />
              <AppChip label="NUSMods search" variant="outline" />
              <AppChip label={currentSemester.semester} variant="outline" />
            </View>

            <AppButton
              label={isSubmitting ? "Creating..." : "Create group"}
              disabled={!canCreateGroup || isSubmitting}
              onPress={() => {
                void handleCreateGroup();
              }}
            />
          </>
        ) : (
          <>
            <SectionCard className="mb-4">
              <SectionHeader title="Community Name" />
              <TextInput
                value={communityName}
                onChangeText={setCommunityName}
                placeholder="e.g. Product Builders @ NUS"
                placeholderTextColor="#9B8C7D"
                className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
              />
              <Text className="mt-2 text-[12px] text-[#9AA0AB]">
                Choose a clear name people will recognise in Discover.
              </Text>

              <TextInput
                value={communityDescription}
                onChangeText={setCommunityDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
                placeholder="What is this community for?"
                placeholderTextColor="#9B8C7D"
                className="mt-3 min-h-[94px] rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3 text-[15px] leading-6 text-[#0F1115]"
              />
            </SectionCard>

            <SectionCard className="mb-4">
              <SectionHeader title="Tags" />
              <View className="flex-row gap-3">
                <TextInput
                  value={communityTagInput}
                  onChangeText={setCommunityTagInput}
                  placeholder="e.g. startups"
                  placeholderTextColor="#9B8C7D"
                  className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                />
                <Pressable
                  onPress={handleAddCommunityTag}
                  className="items-center justify-center rounded-[14px] bg-[#0F1115] px-5"
                >
                  <Text className="text-[13px] font-semibold text-white">Add</Text>
                </Pressable>
              </View>

              <Text className="mt-2 text-[12px] text-[#9AA0AB]">
                Add up to 6 tags so students can discover this space faster.
              </Text>

              {communityTags.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {communityTags.map((tag) => (
                    <Pressable key={tag} onPress={() => removeCommunityTag(tag)}>
                      <AppChip label={`${tag} ×`} variant="outline" />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </SectionCard>

            <SectionCard className="mb-5">
              <SectionHeader title="Privacy" />
              <View className="gap-2">
                {communityPrivacyOptions.map((option) => {
                  const isSelected = communityPrivacy === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      className={`rounded-[16px] border px-4 py-3 ${
                        isSelected
                          ? "border-[#0F1115] bg-[#E7EEF7]"
                          : "border-[#E4E9F1] bg-white"
                      }`}
                      onPress={() => setCommunityPrivacy(option.value)}
                    >
                      <Text className="text-[14px] font-bold text-[#0F1115]">
                        {option.label}
                      </Text>
                      <Text className="mt-1 text-[12px] leading-5 text-[#5C6370]">
                        {option.helper}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>

            <View className="mb-3 flex-row flex-wrap gap-2">
              <AppChip label="Persistent space" />
              <AppChip label="Discover community" variant="outline" />
              <AppChip label="Creator becomes admin" variant="outline" />
            </View>

            <AppButton
              label={isSubmitting ? "Creating..." : "Create community"}
              disabled={!canCreateCommunity || isSubmitting}
              onPress={() => {
                void handleCreateCommunity();
              }}
            />
          </>
        )}
      </ScrollView>
      <ModerationAlert
        visible={isModerationAlertVisible}
        onClose={() => setIsModerationAlertVisible(false)}
      />
    </SafeAreaView>
  );
}
