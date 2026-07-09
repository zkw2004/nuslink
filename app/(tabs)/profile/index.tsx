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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";

import {
  CCA_TAG_OPTIONS,
  INTEREST_TAG_OPTIONS,
  PROJECT_TAG_OPTIONS,
} from "@constants/index";
import {
  AppAvatar,
  AppButton,
  AppChip,
  AppScreenHeader,
  BadgeTierPill,
  ProgressBar,
  SectionCard,
  SectionHeader,
} from "@components/shared";
import { ProfileTagEditor } from "@features/profile/ProfileTagEditor";
import { saveProfileSetup, uploadProfileImage } from "@features/onboarding/onboardingService";
import { toSelectedModule, type SelectedModule } from "@features/onboarding/types";
import { searchNusmodsModules } from "@lib/nusmods";
import {
  fetchCurrentSemesterTimetableSlots,
  formatClassSlotLabel,
  formatDayOfWeek,
  formatMinuteOfDay,
  fetchCurrentSemesterModules,
  fetchProfileViewModel,
  importTimetableFromNusmodsShareUrl,
  parseManualTimeInput,
  searchInterestTagSuggestions,
  updateEditableProfile,
} from "@services/index";
import { WeeklyTimetableView } from "@features/profile/WeeklyTimetableView";
import type { StudyMode, StudyStyle, TimetableClassSlot, TimetableSlot } from "@appTypes/index";
import { useAuthStore } from "@store/index";
import {
  normalizeInterestTag,
  normalizeInterestTags,
  normalizeProfileTag,
  normalizeProfileTags,
} from "@utils/interestTags";

const YEAR_OPTIONS = [1, 2, 3, 4, 5];

const INTENT_OPTIONS = [
  { id: "study_group", label: "Study groups" },
  { id: "hackathon", label: "Hackathons / comps" },
  { id: "tutoring", label: "Tutoring / TA" },
  { id: "internship_networking", label: "Internship networking" },
] as const;

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

const STUDY_STYLE_OPTIONS: { value: StudyStyle; label: string }[] = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "flexible", label: "Open to both" },
];

const GROUP_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const signOut = useAuthStore((state) => state.signOut);

  const [moduleCodes, setModuleCodes] = useState<string[]>([]);
  const [savedTimetableSlots, setSavedTimetableSlots] = useState<TimetableSlot[]>([]);
  const [completion, setCompletion] = useState(0);
  const [editableModules, setEditableModules] = useState<SelectedModule[]>([]);
  const [timetableSlotsDraft, setTimetableSlotsDraft] = useState<TimetableSlot[]>([]);
  const [importedClassSlotsPreview, setImportedClassSlotsPreview] = useState<
    TimetableClassSlot[]
  >([]);
  const [importedAvailabilityPreview, setImportedAvailabilityPreview] = useState<
    TimetableSlot[]
  >([]);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [facultyDraft, setFacultyDraft] = useState("");
  const [majorDraft, setMajorDraft] = useState("");
  const [yearOfStudyDraft, setYearOfStudyDraft] = useState(1);
  const [studyModeDraft, setStudyModeDraft] = useState<StudyMode>("in_person");
  const [studyStyleDraft, setStudyStyleDraft] = useState<StudyStyle>("in_person");
  const [preferredGroupSizeDraft, setPreferredGroupSizeDraft] = useState(4);
  const [interestsDraft, setInterestsDraft] = useState<string[]>([]);
  const [projectTagsDraft, setProjectTagsDraft] = useState<string[]>([]);
  const [ccaTagsDraft, setCcaTagsDraft] = useState<string[]>([]);
  const [intentsDraft, setIntentsDraft] = useState<NonNullable<typeof profile>["intents"]>([]);
  const [moduleQuery, setModuleQuery] = useState("");
  const [moduleResults, setModuleResults] = useState<SelectedModule[]>([]);
  const [timetableShareUrlDraft, setTimetableShareUrlDraft] = useState("");
  const [manualDayDraft, setManualDayDraft] = useState(1);
  const [manualStartDraft, setManualStartDraft] = useState("09:00");
  const [manualEndDraft, setManualEndDraft] = useState("11:00");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [customProjectTagInput, setCustomProjectTagInput] = useState("");
  const [customCcaTagInput, setCustomCcaTagInput] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportingTimetable, setIsImportingTimetable] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isSearchingModules, setIsSearchingModules] = useState(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const badgeTierLabel = useMemo(() => {
    switch (profile?.badge_tier) {
      case "gold":
        return "Standout" as const;
      case "silver":
        return "Trusted" as const;
      case "bronze":
        return "Reliable" as const;
      default:
        return "New" as const;
    }
  }, [profile?.badge_tier]);

  useEffect(() => {
    async function loadProfileDetails() {
      if (!profile) {
        setModuleCodes([]);
        setEditableModules([]);
        setSavedTimetableSlots([]);
        setTimetableSlotsDraft([]);
        setCompletion(0);
        return;
      }

      try {
        const [viewModel, modules, timetableSlots] = await Promise.all([
          fetchProfileViewModel(profile.id, profile),
          fetchCurrentSemesterModules(profile.id),
          fetchCurrentSemesterTimetableSlots(profile.id),
        ]);

        setModuleCodes(viewModel.modules);
        setEditableModules(modules);
        setSavedTimetableSlots(timetableSlots);
        setCompletion(viewModel.completion);

        if (!isEditing) {
          setDisplayNameDraft(profile.display_name);
          setBioDraft(profile.bio);
          setFacultyDraft(profile.faculty ?? "");
          setMajorDraft(profile.major ?? "");
          setYearOfStudyDraft(profile.year_of_study ?? 1);
          setStudyModeDraft(profile.study_mode ?? profile.study_style ?? "in_person");
          setStudyStyleDraft(profile.study_style ?? "in_person");
          setPreferredGroupSizeDraft(profile.preferred_group_size ?? 4);
          setInterestsDraft(normalizeInterestTags(profile.interests));
          setProjectTagsDraft(normalizeProfileTags(profile.project_tags));
          setCcaTagsDraft(normalizeProfileTags(profile.cca_tags));
          setIntentsDraft(profile.intents);
          setTimetableSlotsDraft(timetableSlots);
        }

        if (!isEditing) {
          setAvatarPreviewUri(profile.avatar_url);
        }
      } catch {
        setModuleCodes([]);
        setEditableModules([]);
        setSavedTimetableSlots([]);
        setTimetableSlotsDraft([]);
        setCompletion(0);
      }
    }

    void loadProfileDetails();
  }, [isEditing, profile]);

  useEffect(() => {
    let isActive = true;
    const query = moduleQuery.trim();

    if (!isEditing || query.length < 2) {
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

          const selectedCodes = new Set(
            editableModules.map((module) => module.moduleCode),
          );

          setModuleResults(
            modules
              .map(toSelectedModule)
              .filter((module) => !selectedCodes.has(module.moduleCode)),
          );
        })
        .catch(() => {
          if (isActive) {
            setModuleResults([]);
          }
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
  }, [editableModules, isEditing, moduleQuery]);

  useEffect(() => {
    const trimmedInput = customInterestInput.trim();

    if (!isEditing || trimmedInput.length < 2) {
      setInterestSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      void searchInterestTagSuggestions(trimmedInput)
        .then((nextSuggestions) => {
          setInterestSuggestions(
            nextSuggestions.filter(
              (suggestion) => !interestsDraft.includes(suggestion),
            ),
          );
        })
        .catch(() => {
          setInterestSuggestions([]);
        });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [customInterestInput, interestsDraft, isEditing]);

  function resetDrafts() {
    if (!profile) {
      return;
    }

    setDisplayNameDraft(profile.display_name);
    setBioDraft(profile.bio);
    setFacultyDraft(profile.faculty ?? "");
    setMajorDraft(profile.major ?? "");
    setYearOfStudyDraft(profile.year_of_study ?? 1);
    setStudyModeDraft(profile.study_mode ?? profile.study_style ?? "in_person");
    setStudyStyleDraft(profile.study_style ?? "in_person");
    setPreferredGroupSizeDraft(profile.preferred_group_size ?? 4);
    setInterestsDraft(normalizeInterestTags(profile.interests));
    setProjectTagsDraft(normalizeProfileTags(profile.project_tags));
    setCcaTagsDraft(normalizeProfileTags(profile.cca_tags));
    setIntentsDraft(profile.intents);
    setModuleQuery("");
    setModuleResults([]);
    setTimetableShareUrlDraft("");
    setManualDayDraft(1);
    setManualStartDraft("09:00");
    setManualEndDraft("11:00");
    setTimetableSlotsDraft(savedTimetableSlots);
    setImportedClassSlotsPreview([]);
    setImportedAvailabilityPreview([]);
    setCustomInterestInput("");
    setCustomProjectTagInput("");
    setCustomCcaTagInput("");
  }

  function handleToggleEdit() {
    if (isEditing) {
      resetDrafts();
      setIsEditing(false);
      return;
    }

    resetDrafts();
    setIsEditing(true);
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  async function handlePickProfilePhoto() {
    if (!profile) {
      return;
    }

    setIsUpdatingPhoto(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Photo library permission is needed to change your profile image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.82,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert("Could not read image", "Try choosing a different photo.");
        return;
      }

      setAvatarPreviewUri(
        `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
      );

      const avatarUrl = await uploadProfileImage({
        base64: asset.base64,
        uri: asset.uri,
      });

      const savedProfile = await saveProfileSetup({
        avatarUrl,
        bio: profile.bio,
        displayName: profile.display_name,
      });

      setProfile(savedProfile);
    } catch (error) {
      setAvatarPreviewUri(profile.avatar_url);
      Alert.alert(
        "Could not update photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    if (!profile) {
      return;
    }

    setIsUpdatingPhoto(true);

    try {
      const savedProfile = await saveProfileSetup({
        avatarUrl: null,
        bio: profile.bio,
        displayName: profile.display_name,
      });

      setProfile(savedProfile);
      setAvatarPreviewUri(null);
    } catch (error) {
      Alert.alert(
        "Could not remove photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsUpdatingPhoto(false);
    }
  }

  function handleEditPhoto() {
    if (!profile || !isEditing) {
      return;
    }

    const buttons: {
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }[] = [
      {
        text: profile.avatar_url ? "Change photo" : "Add photo",
        onPress: () => {
          void handlePickProfilePhoto();
        },
      },
    ];

    if (profile.avatar_url) {
      buttons.push({
        text: "Remove photo",
        style: "destructive",
        onPress: () => {
          void handleRemoveProfilePhoto();
        },
      });
    }

    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Edit profile photo", "Update your display picture.", buttons);
  }

  function toggleInterest(interest: string) {
    setInterestsDraft((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  function addCustomInterest() {
    const trimmedInterest = normalizeInterestTag(customInterestInput);

    if (!trimmedInterest || interestsDraft.includes(trimmedInterest)) {
      return;
    }

    setInterestsDraft((current) => normalizeInterestTags([...current, trimmedInterest]));
    setCustomInterestInput("");
    setInterestSuggestions([]);
  }

  function toggleProjectTag(tag: string) {
    setProjectTagsDraft((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : normalizeProfileTags([...current, tag]),
    );
  }

  function addCustomProjectTag() {
    const trimmedTag = normalizeProfileTag(customProjectTagInput);

    if (!trimmedTag || projectTagsDraft.includes(trimmedTag)) {
      return;
    }

    setProjectTagsDraft((current) => normalizeProfileTags([...current, trimmedTag]));
    setCustomProjectTagInput("");
  }

  function removeProjectTag(tag: string) {
    setProjectTagsDraft((current) => current.filter((item) => item !== tag));
  }

  function toggleCcaTag(tag: string) {
    setCcaTagsDraft((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : normalizeProfileTags([...current, tag]),
    );
  }

  function addCustomCcaTag() {
    const trimmedTag = normalizeProfileTag(customCcaTagInput);

    if (!trimmedTag || ccaTagsDraft.includes(trimmedTag)) {
      return;
    }

    setCcaTagsDraft((current) => normalizeProfileTags([...current, trimmedTag]));
    setCustomCcaTagInput("");
  }

  function removeCcaTag(tag: string) {
    setCcaTagsDraft((current) => current.filter((item) => item !== tag));
  }

  function removeInterest(interest: string) {
    setInterestsDraft((current) => current.filter((item) => item !== interest));
  }

  function applyInterestSuggestion(interest: string) {
    setInterestsDraft((current) => normalizeInterestTags([...current, interest]));
    setCustomInterestInput("");
    setInterestSuggestions([]);
  }

  function toggleIntent(
    intent: NonNullable<typeof profile>["intents"][number],
  ) {
    setIntentsDraft((current) =>
      current.includes(intent)
        ? current.filter((item) => item !== intent)
        : [...current, intent],
    );
  }

  function addModule(module: SelectedModule) {
    setEditableModules((current) => [...current, module]);
    setModuleQuery("");
    setModuleResults([]);
  }

  function removeModule(moduleCode: string) {
    setEditableModules((current) =>
      current.filter((module) => module.moduleCode !== moduleCode),
    );
  }

  async function handleImportTimetable() {
    const trimmedUrl = timetableShareUrlDraft.trim();

    if (!trimmedUrl) {
      Alert.alert("Paste a share link", "Add your NUSMods timetable share URL first.");
      return;
    }

    setIsImportingTimetable(true);

    try {
      const importedTimetable = await importTimetableFromNusmodsShareUrl(trimmedUrl);
      setImportedClassSlotsPreview(importedTimetable.occupiedSlots);
      setImportedAvailabilityPreview(importedTimetable.availabilitySlots);
    } catch (error) {
      Alert.alert(
        "Could not import timetable",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsImportingTimetable(false);
    }
  }

  function handleApplyImportedAvailability() {
    if (importedAvailabilityPreview.length === 0) {
      return;
    }

    setTimetableSlotsDraft(importedAvailabilityPreview);
    setTimetableShareUrlDraft("");
    Alert.alert(
      "Timetable linked",
      `Matched ${importedClassSlotsPreview.length} lesson slots. Your availability has been saved behind the scenes for matching.`,
    );
  }

  function handleRemoveImportedTimetable() {
    setTimetableSlotsDraft((current) =>
      current.filter((slot) => slot.source !== "nusmods"),
    );
    setImportedAvailabilityPreview([]);
    setImportedClassSlotsPreview([]);
    setTimetableShareUrlDraft("");
  }

  function handleAddManualTimetableBlock() {
    try {
      const startMinute = parseManualTimeInput(manualStartDraft);
      const endMinute = parseManualTimeInput(manualEndDraft);

      if (endMinute <= startMinute) {
        Alert.alert("Invalid time range", "End time must be later than start time.");
        return;
      }

      const nextSlot: TimetableSlot = {
        day_of_week: manualDayDraft,
        start_minute: startMinute,
        end_minute: endMinute,
        source: "manual",
      };

      const duplicateExists = timetableSlotsDraft.some(
        (slot) =>
          slot.day_of_week === nextSlot.day_of_week &&
          slot.start_minute === nextSlot.start_minute &&
          slot.end_minute === nextSlot.end_minute,
      );

      if (duplicateExists) {
        Alert.alert("Block already added", "That availability block is already in your timetable.");
        return;
      }

      setTimetableSlotsDraft((current) =>
        [...current, nextSlot].sort(
          (left, right) =>
            left.day_of_week - right.day_of_week ||
            left.start_minute - right.start_minute,
        ),
      );
      setManualStartDraft("09:00");
      setManualEndDraft("11:00");
    } catch (error) {
      Alert.alert(
        "Invalid time format",
        error instanceof Error ? error.message : "Use HH:MM format.",
      );
    }
  }

  function removeTimetableSlot(slotToRemove: TimetableSlot) {
    setTimetableSlotsDraft((current) =>
      current.filter((slot) => {
        return !(
          slot.day_of_week === slotToRemove.day_of_week &&
          slot.start_minute === slotToRemove.start_minute &&
          slot.end_minute === slotToRemove.end_minute &&
          slot.source === slotToRemove.source
        );
      }),
    );
  }

  async function handleSaveDetails() {
    if (!profile) {
      return;
    }

    if (!displayNameDraft.trim() || !facultyDraft.trim() || !majorDraft.trim()) {
      Alert.alert(
        "Missing fields",
        "Display name, faculty, and major are required.",
      );
      return;
    }

    if (interestsDraft.length === 0) {
      Alert.alert("Add interests", "Choose at least one interest before saving.");
      return;
    }

    if (intentsDraft.length === 0) {
      Alert.alert("Add intents", "Choose at least one intent before saving.");
      return;
    }

    if (editableModules.length === 0) {
      Alert.alert(
        "Add modules",
        "Choose at least one current-semester module before saving.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await updateEditableProfile(profile.id, {
        displayName: displayNameDraft,
        bio: bioDraft,
        faculty: facultyDraft,
        major: majorDraft,
        yearOfStudy: yearOfStudyDraft,
        studyMode: studyModeDraft,
        studyStyle: studyStyleDraft,
        preferredGroupSize: preferredGroupSizeDraft,
        interests: interestsDraft,
        projectTags: projectTagsDraft,
        ccaTags: ccaTagsDraft,
        intents: intentsDraft,
        modules: editableModules,
        timetableSlots: timetableSlotsDraft,
      });

      await refreshProfile(profile.id);
      setIsEditing(false);
    } catch (error) {
      Alert.alert(
        "Could not save profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
        <AppScreenHeader title="Profile" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-[#5C6370]">
            Sign in to view your M1 profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const subtitleParts = [
    profile.major,
    profile.year_of_study ? `Y${profile.year_of_study}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const visibleInterests = isEditing ? interestsDraft : profile.interests;
  const visibleProjectTags = isEditing ? projectTagsDraft : profile.project_tags;
  const visibleCcaTags = isEditing ? ccaTagsDraft : profile.cca_tags;
  const visibleIntents = isEditing ? intentsDraft : profile.intents;
  const visibleModules = isEditing
    ? editableModules.map((module) => module.moduleCode)
    : moduleCodes;
  const visibleTimetableSlots = isEditing ? timetableSlotsDraft : savedTimetableSlots;
  const visibleManualTimetableSlots = visibleTimetableSlots.filter(
    (slot) => slot.source === "manual",
  );
  const hasImportedTimetable = visibleTimetableSlots.some(
    (slot) => slot.source === "nusmods",
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Profile"
        actions={[
          {
            icon: "pencil",
            accessibilityLabel: isEditing ? "Stop editing" : "Edit profile",
            onPress: handleToggleEdit,
          },
          {
            icon: "gearshape.fill",
            accessibilityLabel: "Sign out",
            onPress: () => {
              void handleSignOut();
            },
          },
        ]}
      />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center gap-[14px] px-[2px] pb-4 pt-2">
          <View className="items-center">
            <Pressable
              className="relative"
              disabled={!isEditing || isUpdatingPhoto}
              onPress={handleEditPhoto}
            >
              <AppAvatar
                name={profile.display_name || "NUSLink"}
                imageUri={avatarPreviewUri ?? profile.avatar_url}
                size={84}
                rounded={false}
              />
              {isEditing ? (
                <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-[2px] border-white bg-[#0F1115]">
                  {isUpdatingPhoto ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <SymbolView
                      name={{ ios: "pencil", android: "edit", web: "edit" }}
                      size={14}
                      tintColor="#FFFFFF"
                    />
                  )}
                </View>
              ) : null}
            </Pressable>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[22px] font-bold tracking-[-0.6px] text-[#0F1115]">
                {isEditing
                  ? displayNameDraft || "Set your display name"
                  : profile.display_name || "Set your display name"}
              </Text>
              <BadgeTierPill tier={badgeTierLabel} />
            </View>
            <Text className="mt-[3px] text-[14px] text-[#5C6370]">
              {isEditing
                ? [majorDraft, `Y${yearOfStudyDraft}`].filter(Boolean).join(" · ")
                : subtitleParts ||
                  profile.faculty ||
                  "Complete onboarding to finish your profile"}
            </Text>
          </View>
        </View>

        <SectionCard className="mb-4">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className="text-[14px] font-semibold text-[#0F1115]">
              Profile completion
            </Text>
            <Text className="text-[18px] font-bold tracking-[-0.4px] text-[#0F1115]">
              {completion}%
            </Text>
          </View>

          <ProgressBar value={completion} />

          <View className="mt-3 flex-row items-center gap-[10px] rounded-xl bg-[#E7EEF7] px-3 py-[10px]">
            <View className="h-4 w-4 items-center justify-center rounded-full bg-[#0F1115]">
              <Text className="text-[10px] font-bold text-white">+</Text>
            </View>
            <Text className="flex-1 text-[12px] font-medium leading-[17px] text-[#0F1115]">
              Milestone 1 completion is based on your core onboarding fields and current-semester modules.
            </Text>
          </View>
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Profile Basics" />
          {isEditing ? (
            <View className="gap-3">
              <TextInput
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                placeholder="Display name"
                placeholderTextColor="#9AA0AB"
              />
              <TextInput
                value={bioDraft}
                onChangeText={setBioDraft}
                multiline
                textAlignVertical="top"
                className="min-h-[110px] rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3 text-[15px] leading-6 text-[#0F1115]"
                placeholder="What you're studying and what you're looking for."
                placeholderTextColor="#9AA0AB"
              />
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-[14px] font-semibold text-[#0F1115]">
                {profile.display_name || "No display name saved yet."}
              </Text>
              <Text className="text-[14px] leading-6 text-[#0F1115]">
                {profile.bio ||
                  "Add a short bio during onboarding to help other students know what you are looking for."}
              </Text>
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Academics" />
          {isEditing ? (
            <View className="gap-3">
              <TextInput
                value={facultyDraft}
                onChangeText={setFacultyDraft}
                className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                placeholder="Faculty"
                placeholderTextColor="#9AA0AB"
              />
              <TextInput
                value={majorDraft}
                onChangeText={setMajorDraft}
                className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                placeholder="Major"
                placeholderTextColor="#9AA0AB"
              />
              <View className="flex-row gap-1 rounded-2xl bg-[#EEF2F7] p-1">
                {YEAR_OPTIONS.map((year) => {
                  const isSelected = year === yearOfStudyDraft;
                  return (
                    <Pressable
                      key={year}
                      className={`h-10 flex-1 items-center justify-center rounded-xl ${
                        isSelected ? "bg-[#0F1115]" : "bg-transparent"
                      }`}
                      onPress={() => setYearOfStudyDraft(year)}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? "text-white" : "text-[#5C6370]"
                        }`}
                      >
                        Y{year}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-[14px] leading-6 text-[#0F1115]">
                {[profile.faculty, profile.major, profile.year_of_study ? `Year ${profile.year_of_study}` : null]
                  .filter(Boolean)
                  .join(" · ") || "No academic details saved yet."}
              </Text>
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Study Preferences" />
          {isEditing ? (
            <View className="gap-4">
              <View>
                <Text className="mb-2 text-[13px] font-semibold text-[#0F1115]">
                  Study mode
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {STUDY_STYLE_OPTIONS.map((option) => {
                    const isSelected = option.value === studyModeDraft;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setStudyModeDraft(option.value);
                          setStudyStyleDraft(option.value);
                        }}
                      >
                        <AppChip
                          label={option.label}
                          variant={isSelected ? "solid" : "outline"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="mb-2 text-[13px] font-semibold text-[#0F1115]">
                  Preferred group size
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {GROUP_SIZE_OPTIONS.map((groupSize) => {
                    const isSelected = groupSize === preferredGroupSizeDraft;

                    return (
                      <Pressable
                        key={groupSize}
                        onPress={() => setPreferredGroupSizeDraft(groupSize)}
                      >
                        <AppChip
                          label={`${groupSize}`}
                          variant={isSelected ? "solid" : "outline"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-[14px] leading-6 text-[#0F1115]">
                {`Study mode: ${
                  (profile.study_mode ?? profile.study_style)
                    ? STUDY_STYLE_OPTIONS.find(
                        (option) => option.value === (profile.study_mode ?? profile.study_style),
                      )?.label ?? (profile.study_mode ?? profile.study_style)
                    : "Not set"
                }`}
              </Text>
              <Text className="text-[14px] leading-6 text-[#0F1115]">
                {`Preferred group size: ${profile.preferred_group_size ?? "Not set"}`}
              </Text>
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Here For" />
          {isEditing ? (
            <View className="flex-row flex-wrap gap-2">
              {INTENT_OPTIONS.map((intent) => {
                const isSelected = intentsDraft.includes(intent.id);

                return (
                  <Pressable
                    key={intent.id}
                    className={`rounded-full border px-4 py-2 ${
                      isSelected
                        ? "border-[#0F1115] bg-[#0F1115]"
                        : "border-[#E4E9F1] bg-white"
                    }`}
                    onPress={() => toggleIntent(intent.id)}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        isSelected ? "text-white" : "text-[#5C6370]"
                      }`}
                    >
                      {intent.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {visibleIntents.length > 0 ? (
                visibleIntents.map((intent) => (
                  <AppChip
                    key={intent}
                    label={intent
                      .replaceAll("_", " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  />
                ))
              ) : (
                <Text className="text-[13px] text-[#5C6370]">No intents saved yet.</Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title={`This Semester · ${visibleModules.length}`} />
          {isEditing ? (
            <View>
              <TextInput
                value={moduleQuery}
                onChangeText={(nextValue) => setModuleQuery(nextValue.toUpperCase())}
                autoCapitalize="characters"
                className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] uppercase text-[#0F1115]"
                placeholder="Search NUSMods e.g. CS2040S"
                placeholderTextColor="#9AA0AB"
              />

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
                      onPress={() => addModule(module)}
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

              <View className="mt-3 flex-row flex-wrap gap-2">
                {editableModules.map((module) => (
                  <Pressable
                    key={module.moduleCode}
                    className="rounded-full bg-[#E1EAF5] px-3 py-2"
                    onPress={() => removeModule(module.moduleCode)}
                  >
                    <Text className="text-[13px] font-semibold text-[#5B7BA3]">
                      {module.moduleCode} ×
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {visibleModules.length > 0 ? (
                visibleModules.map((moduleCode) => (
                  <AppChip key={moduleCode} label={moduleCode} variant="module" />
                ))
              ) : (
                <Text className="text-[13px] text-[#5C6370]">
                  No current-semester modules saved yet.
                </Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Interests" />
          {isEditing ? (
            <ProfileTagEditor
              title="Academic interest tags"
              description="Use the shared tag bank first, then add niche custom interests only when you need them."
              selectedTags={interestsDraft}
              optionTags={INTEREST_TAG_OPTIONS}
              customInput={customInterestInput}
              customPlaceholder="Add a niche custom interest"
              onCustomInputChange={setCustomInterestInput}
              onToggleTag={toggleInterest}
              onAddCustomTag={addCustomInterest}
              onRemoveCustomTag={removeInterest}
              suggestions={interestSuggestions}
              onApplySuggestion={applyInterestSuggestion}
            />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {visibleInterests.length > 0 ? (
                visibleInterests.map((interest) => (
                  <AppChip key={interest} label={interest} variant="outline" />
                ))
              ) : (
                <Text className="text-[13px] text-[#5C6370]">No interests saved yet.</Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Project Topics" />
          {isEditing ? (
            <ProfileTagEditor
              title="Project tags"
              description="These act as softer collaboration signals for project-team and hackathon matching."
              selectedTags={projectTagsDraft}
              optionTags={PROJECT_TAG_OPTIONS}
              customInput={customProjectTagInput}
              customPlaceholder="Add a project topic"
              onCustomInputChange={setCustomProjectTagInput}
              onToggleTag={toggleProjectTag}
              onAddCustomTag={addCustomProjectTag}
              onRemoveCustomTag={removeProjectTag}
            />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {visibleProjectTags.length > 0 ? (
                visibleProjectTags.map((tag) => (
                  <AppChip key={tag} label={tag} variant="outline" />
                ))
              ) : (
                <Text className="text-[13px] text-[#5C6370]">
                  No project tags saved yet.
                </Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="CCA Context" />
          {isEditing ? (
            <ProfileTagEditor
              title="CCA tags"
              description="Keep these broad and honest so the matching service can use them as lightweight shared-context signals."
              selectedTags={ccaTagsDraft}
              optionTags={CCA_TAG_OPTIONS}
              customInput={customCcaTagInput}
              customPlaceholder="Add a club, sport, or activity"
              onCustomInputChange={setCustomCcaTagInput}
              onToggleTag={toggleCcaTag}
              onAddCustomTag={addCustomCcaTag}
              onRemoveCustomTag={removeCcaTag}
            />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {visibleCcaTags.length > 0 ? (
                visibleCcaTags.map((tag) => (
                  <AppChip key={tag} label={tag} variant="outline" />
                ))
              ) : (
                <Text className="text-[13px] text-[#5C6370]">
                  No CCA tags saved yet.
                </Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader
            title={`Timetable Availability · ${visibleManualTimetableSlots.length}`}
          />
          {isEditing ? (
            <View className="gap-4">
              <View className="rounded-2xl bg-[#F7F9FC] p-3">
                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Import from NUSMods
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                  Paste your NUSMods timetable share URL. We will show the lesson slots we matched, then save the derived availability behind the scenes for matching.
                </Text>
                <TextInput
                  value={timetableShareUrlDraft}
                  onChangeText={setTimetableShareUrlDraft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mt-3 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[14px] text-[#0F1115]"
                  placeholder="https://nusmods.com/timetable/sem-1/share?..."
                  placeholderTextColor="#9AA0AB"
                />
                <View className="mt-3">
                  <AppButton
                    label={isImportingTimetable ? "Importing..." : "Import share URL"}
                    disabled={isImportingTimetable}
                    onPress={() => {
                      void handleImportTimetable();
                    }}
                  />
                </View>
              </View>

              {importedClassSlotsPreview.length > 0 ? (
                <View className="rounded-2xl bg-[#F7F9FC] p-3">
                  <Text className="text-[13px] font-semibold text-[#0F1115]">
                    Matched class slots from NUSMods
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                    Review these first. If they do not reflect your real timetable, do not apply the derived availability yet.
                  </Text>

                  <View className="mt-3 gap-2">
                    {importedClassSlotsPreview.map((slot) => (
                      <View
                        key={`${slot.module_code}-${slot.lesson_type}-${slot.class_no}-${slot.day_of_week}-${slot.start_minute}`}
                        className="rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3"
                      >
                        <Text className="text-[14px] font-semibold text-[#0F1115]">
                          {formatDayOfWeek(slot.day_of_week)} · {formatMinuteOfDay(slot.start_minute)} -{" "}
                          {formatMinuteOfDay(slot.end_minute)}
                        </Text>
                        <Text className="mt-1 text-[12px] text-[#5C6370]">
                          {formatClassSlotLabel(slot)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="mt-3">
                    <AppButton
                      label="Use this timetable for matching"
                      onPress={handleApplyImportedAvailability}
                    />
                  </View>
                </View>
              ) : null}

              {timetableSlotsDraft.some((slot) => slot.source === "nusmods") ? (
                <View className="rounded-2xl bg-[#F7F9FC] p-3">
                  <Text className="text-[13px] font-semibold text-[#0F1115]">
                    NUSMods timetable connected
                  </Text>
                  <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                    Imported lesson timing is being used behind the scenes to calculate overlap. We are hiding the derived free blocks from this screen.
                  </Text>
                  <View className="mt-3">
                    <AppButton
                      label="Remove imported timetable"
                      variant="secondary"
                      onPress={handleRemoveImportedTimetable}
                    />
                  </View>
                </View>
              ) : null}

              <View className="rounded-2xl bg-[#F7F9FC] p-3">
                <Text className="text-[13px] font-semibold text-[#0F1115]">
                  Manual fallback
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                  Add extra free blocks manually if you prefer certain study windows or if your share link is incomplete.
                </Text>

                <View className="mt-3 flex-row flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => {
                    const isSelected = manualDayDraft === day.value;
                    return (
                      <Pressable
                        key={day.value}
                        className={`rounded-full border px-3 py-2 ${
                          isSelected
                            ? "border-[#0F1115] bg-[#0F1115]"
                            : "border-[#E4E9F1] bg-white"
                        }`}
                        onPress={() => setManualDayDraft(day.value)}
                      >
                        <Text
                          className={`text-[13px] font-semibold ${
                            isSelected ? "text-white" : "text-[#5C6370]"
                          }`}
                        >
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-3 flex-row gap-2">
                  <TextInput
                    value={manualStartDraft}
                    onChangeText={setManualStartDraft}
                    className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                    placeholder="09:00"
                    placeholderTextColor="#9AA0AB"
                  />
                  <TextInput
                    value={manualEndDraft}
                    onChangeText={setManualEndDraft}
                    className="flex-1 rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-4 text-[15px] text-[#0F1115]"
                    placeholder="11:00"
                    placeholderTextColor="#9AA0AB"
                  />
                </View>

                <View className="mt-3">
                  <AppButton
                    label="Add manual block"
                    variant="secondary"
                    onPress={handleAddManualTimetableBlock}
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 text-[13px] font-semibold text-[#0F1115]">
                  Weekly availability preview
                </Text>
                <WeeklyTimetableView
                  slots={timetableSlotsDraft}
                  emptyLabel="Import a NUSMods share URL or add manual free blocks to preview your week."
                />
              </View>

              <View className="gap-2">
                {visibleManualTimetableSlots.length > 0 ? (
                  visibleManualTimetableSlots.map((slot) => (
                    <Pressable
                      key={`${slot.day_of_week}-${slot.start_minute}-${slot.end_minute}-${slot.source}`}
                      className="flex-row items-center justify-between rounded-[14px] border border-[#E4E9F1] bg-white px-4 py-3"
                      onPress={() => removeTimetableSlot(slot)}
                    >
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-[#0F1115]">
                          {formatDayOfWeek(slot.day_of_week)} · {formatMinuteOfDay(slot.start_minute)} -{" "}
                          {formatMinuteOfDay(slot.end_minute)}
                        </Text>
                        <Text className="mt-1 text-[12px] text-[#5C6370]">
                          Manual free block
                        </Text>
                      </View>
                      <Text className="text-[13px] font-semibold text-[#5B7BA3]">
                        Remove
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text className="text-[13px] leading-5 text-[#5C6370]">
                    {hasImportedTimetable
                      ? "Your imported timetable is already being used for matching. Add manual free blocks only if you want to override or supplement it."
                      : "No timetable availability saved yet. Import a NUSMods link or add manual blocks for better schedule-overlap matches."}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View className="gap-2">
              {hasImportedTimetable ? (
                <View className="rounded-[14px] bg-[#F7F9FC] px-4 py-3">
                  <Text className="text-[14px] font-semibold text-[#0F1115]">
                    NUSMods timetable connected
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#5C6370]">
                    Used behind the scenes to calculate schedule-overlap matching.
                  </Text>
                </View>
              ) : null}
              {visibleManualTimetableSlots.length > 0 ? (
                visibleManualTimetableSlots.map((slot) => (
                  <View
                    key={`${slot.day_of_week}-${slot.start_minute}-${slot.end_minute}-${slot.source}`}
                    className="rounded-[14px] bg-[#F7F9FC] px-4 py-3"
                  >
                    <Text className="text-[14px] font-semibold text-[#0F1115]">
                      {formatDayOfWeek(slot.day_of_week)} · {formatMinuteOfDay(slot.start_minute)} -{" "}
                      {formatMinuteOfDay(slot.end_minute)}
                    </Text>
                    <Text className="mt-1 text-[12px] text-[#5C6370]">
                      Manual free block
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-[13px] leading-5 text-[#5C6370]">
                  {hasImportedTimetable
                    ? "Your imported timetable is being used for schedule-overlap matching."
                    : "Add timetable availability to improve schedule-overlap matching in the People tab."}
                </Text>
              )}
            </View>
          )}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader title="Skills" />
          <View className="flex-row flex-wrap gap-2">
            {profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <AppChip key={skill} label={skill} variant="outline" />
              ))
            ) : (
              <Text className="text-[13px] text-[#5C6370]">
                Skills and richer profile editing are intentionally deferred beyond M1.
              </Text>
            )}
          </View>
        </SectionCard>

        {isEditing ? (
          <View className="mt-1 gap-3">
            <AppButton
              label={isSaving ? "Saving..." : "Save changes"}
              disabled={isSaving}
              onPress={() => {
                void handleSaveDetails();
              }}
            />
            <AppButton
              label="Cancel"
              disabled={isSaving}
              variant="secondary"
              onPress={handleToggleEdit}
            />
          </View>
        ) : (
          <View className="mt-1 rounded-2xl bg-[#E1EAF5] px-[14px] py-3">
            <Text className="text-[13px] font-semibold text-[#5B7BA3]">
              Milestone 2 status
            </Text>
            <Text className="mt-1 text-[13px] leading-5 text-[#5B7BA3]">
              People matching is now live. Add timetable availability here to improve schedule overlap, and target-grade controls can follow in the next matching pass.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
