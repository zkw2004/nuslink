import {
  useEffect,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { CCA_TAG_OPTIONS } from "@constants/index";
import { AppAvatar, GlassButton, GlassSurface } from "@components/shared";
import { ModerationAlert } from "@components/moderation";
import { saveProfileSetup, uploadProfileImage } from "@features/onboarding/onboardingService";
import { toSelectedModule, type SelectedModule } from "@features/onboarding/types";
import { ProfessionalProfileSection } from "@features/profile/ProfessionalProfileSection";
import { NudgePreferencesCard } from "@features/profile/NudgePreferencesCard";
import { PushNotificationsCard } from "@features/profile/PushNotificationsCard";
import { WeeklyTimetableView } from "@features/profile/WeeklyTimetableView";
import { searchNusmodsModules } from "@lib/nusmods";
import {
  fetchCurrentSemesterModules,
  fetchCurrentSemesterTimetableSlots,
  fetchNudgePreferences,
  fetchProfileViewModel,
  evaluateSmartNudges,
  formatClassSlotLabel,
  formatDayOfWeek,
  formatMinuteOfDay,
  importTimetableFromNusmodsShareUrl,
  parseManualTimeInput,
  searchInterestTagSuggestions,
  checkContentBatch,
  confirmFlaggedContent,
  hasBlockedModeration,
  hasFlaggedModeration,
  updateNudgePreferences,
  updateEditableProfile,
} from "@services/index";
import { DEFAULT_NUDGE_PREFERENCES } from "@services/nudgesService";
import {
  fetchProfessionalProfile,
  upsertPrimaryProfessionalLink,
} from "@services/profileExtractionService";
import type {
  NudgePreferences,
  StudyMode,
  StudyStyle,
  TimetableClassSlot,
  TimetableSlot,
  UserProfile,
} from "@appTypes/index";
import { useAuthStore } from "@store/index";
import {
  normalizeInterestTag,
  normalizeInterestTags,
  normalizeProfileTag,
  normalizeProfileTags,
} from "@utils/interestTags";

const INTENT_OPTIONS = [
  { id: "study_group", label: "Study groups" },
  { id: "hackathon", label: "Hackathons / comps" },
  { id: "tutoring", label: "Tutoring / TA" },
  { id: "internship_networking", label: "Internship networking" },
] as const;

const STUDY_STYLE_OPTIONS: { label: string; value: StudyStyle }[] = [
  { label: "In person", value: "in_person" },
  { label: "Online", value: "online" },
  { label: "Open to both", value: "flexible" },
] as const;

const DAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
] as const;

const SETTINGS_SECTIONS = [
  {
    key: "basics",
    title: "Profile basics",
    sub: "Headline, bio, and profile photo.",
    feeds: false,
  },
  {
    key: "herefor",
    title: "Here for",
    sub: "Pick 1–3 intents that guide matching.",
    feeds: true,
  },
  {
    key: "academics",
    title: "Academics",
    sub: "Current modules and study preferences.",
    feeds: true,
  },
  {
    key: "skills",
    title: "Skills & interests",
    sub: "Manage the tags shown on your profile.",
    feeds: true,
  },
  {
    key: "links",
    title: "Hall / CCA / links",
    sub: "Context fields kept off the public profile for now.",
    feeds: false,
  },
  {
    key: "timetable",
    title: "Timetable",
    sub: "Private availability used for schedule overlap only.",
    feeds: true,
  },
  {
    key: "ai",
    title: "AI profile import",
    sub: "Open the review flow for resume-based profile import.",
    feeds: false,
  },
  {
    key: "account",
    title: "Account",
    sub: "Control smart nudges and account visibility.",
    feeds: false,
  },
] as const;

const SECTION_TITLES: Record<(typeof SETTINGS_SECTIONS)[number]["key"], string> = {
  basics: "Profile basics",
  herefor: "Here for",
  academics: "Academics",
  skills: "Skills & interests",
  links: "Hall / CCA / links",
  timetable: "Timetable",
  ai: "AI profile import",
  account: "Account",
};

type SectionKey = (typeof SETTINGS_SECTIONS)[number]["key"];

function Card({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <GlassSurface tint="light" radius={22} intensity={35} style={styles.card}>
      <View style={styles.cardInner}>
        {title ? <Text style={styles.sectionLabel}>{title}</Text> : null}
        {children}
      </View>
    </GlassSurface>
  );
}

function GlassField({
  multiline = false,
  style,
  ...props
}: ComponentProps<typeof TextInput> & {
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, multiline ? styles.fieldTall : null, style]}>
      <BlurView
        intensity={30}
        tint="systemChromeMaterialLight"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255,255,255,0.42)" },
        ]}
      />
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#8A8A9C"
        style={[styles.fieldInput, multiline ? styles.fieldInputTall : null]}
      />
    </View>
  );
}

function TogglePill({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <GlassButton
      label={label}
      onPress={onPress}
      radius={100}
      style={isActive ? styles.togglePillActive : undefined}
      textStyle={[
        styles.togglePillText,
        isActive ? styles.togglePillTextActive : undefined,
      ]}
      variant={isActive ? "dark" : "light"}
    />
  );
}

function RemovableChip({
  label,
  onRemove,
  variant = "outline",
}: {
  label: string;
  onRemove?: () => void;
  variant?: "module" | "outline";
}) {
  return (
    <View
      style={[
        styles.removableChip,
        variant === "module" ? styles.removableChipModule : null,
      ]}
    >
      <Text
        style={[
          styles.removableChipText,
          variant === "module" ? styles.removableChipTextModule : null,
        ]}
      >
        {label}
      </Text>
      {onRemove ? (
        <Pressable accessibilityLabel={`Remove ${label}`} onPress={onRemove}>
          <Ionicons
            color={variant === "module" ? "#6E86C0" : "#8A8A9C"}
            name="close"
            size={13}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProfileSettingsScreen() {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [section, setSection] = useState<SectionKey | null>(null);
  const [completion, setCompletion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModerationAlertVisible, setIsModerationAlertVisible] = useState(false);
  const [isImportingTimetable, setIsImportingTimetable] = useState(false);
  const [isSearchingModules, setIsSearchingModules] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [headlineDraft, setHeadlineDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [facultyDraft, setFacultyDraft] = useState("");
  const [majorDraft, setMajorDraft] = useState("");
  const [yearOfStudyDraft, setYearOfStudyDraft] = useState(1);
  const [hallResidenceDraft, setHallResidenceDraft] = useState("");
  const [studyModeDraft, setStudyModeDraft] = useState<StudyMode>("in_person");
  const [studyStyleDraft, setStudyStyleDraft] = useState<StudyStyle>("in_person");
  const [preferredGroupSizeDraft, setPreferredGroupSizeDraft] = useState(4);
  const [interestsDraft, setInterestsDraft] = useState<string[]>([]);
  const [ccaTagsDraft, setCcaTagsDraft] = useState<string[]>([]);
  const [skillsDraft, setSkillsDraft] = useState<string[]>([]);
  const [intentsDraft, setIntentsDraft] = useState<UserProfile["intents"]>([]);
  const [editableModules, setEditableModules] = useState<SelectedModule[]>([]);
  const [timetableSlotsDraft, setTimetableSlotsDraft] = useState<TimetableSlot[]>([]);
  const [professionalLinkDraft, setProfessionalLinkDraft] = useState("");
  const [nudgePreferencesDraft, setNudgePreferencesDraft] =
    useState<NudgePreferences>(DEFAULT_NUDGE_PREFERENCES);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const [moduleQuery, setModuleQuery] = useState("");
  const [moduleResults, setModuleResults] = useState<SelectedModule[]>([]);
  const [timetableShareUrlDraft, setTimetableShareUrlDraft] = useState("");
  const [manualDayDraft, setManualDayDraft] = useState(1);
  const [manualStartDraft, setManualStartDraft] = useState("09:00");
  const [manualEndDraft, setManualEndDraft] = useState("11:00");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [customCcaInput, setCustomCcaInput] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [importedClassSlotsPreview, setImportedClassSlotsPreview] = useState<
    TimetableClassSlot[]
  >([]);
  const [importedAvailabilityPreview, setImportedAvailabilityPreview] = useState<
    TimetableSlot[]
  >([]);

  useEffect(() => {
    let isActive = true;

    async function loadDetails() {
      if (!profile) {
        return;
      }

      setIsLoading(true);

      try {
        const [
          viewModel,
          modules,
          timetableSlots,
          professionalProfile,
          nudgePreferences,
        ] =
          await Promise.all([
            fetchProfileViewModel(profile.id, profile),
            fetchCurrentSemesterModules(profile.id),
            fetchCurrentSemesterTimetableSlots(profile.id),
            fetchProfessionalProfile(profile.id),
            fetchNudgePreferences(profile.id).catch(
              () => DEFAULT_NUDGE_PREFERENCES,
            ),
          ]);

        if (!isActive) {
          return;
        }

        setCompletion(viewModel.completion);
        setEditableModules(modules);
        setTimetableSlotsDraft(timetableSlots);
        setDisplayNameDraft(profile.display_name);
        setHeadlineDraft(profile.headline ?? "");
        setBioDraft(profile.bio);
        setFacultyDraft(profile.faculty ?? "");
        setMajorDraft(profile.major ?? "");
        setYearOfStudyDraft(profile.year_of_study ?? 1);
        setHallResidenceDraft(profile.hall_residence ?? "");
        setStudyModeDraft(profile.study_mode ?? profile.study_style ?? "in_person");
        setStudyStyleDraft(profile.study_style ?? "in_person");
        setPreferredGroupSizeDraft(profile.preferred_group_size ?? 4);
        setInterestsDraft(normalizeInterestTags(profile.interests));
        setCcaTagsDraft(normalizeProfileTags(profile.cca_tags));
        setSkillsDraft(normalizeProfileTags(profile.skills));
        setIntentsDraft(profile.intents);
        setAvatarPreviewUri(profile.avatar_url);
        setProfessionalLinkDraft(
          professionalProfile.links.find(
            (link) => link.label === "portfolio" || link.label === "other",
          )?.url ?? "",
        );
        setNudgePreferencesDraft(nudgePreferences);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      isActive = false;
    };
  }, [profile]);

  useEffect(() => {
    let isActive = true;
    const query = moduleQuery.trim();

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
  }, [editableModules, moduleQuery]);

  useEffect(() => {
    const query = customInterestInput.trim();

    if (query.length < 2) {
      setInterestSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      void searchInterestTagSuggestions(query)
        .then((suggestions) => {
          setInterestSuggestions(
            suggestions.filter((suggestion) => !interestsDraft.includes(suggestion)),
          );
        })
        .catch(() => {
          setInterestSuggestions([]);
        });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [customInterestInput, interestsDraft]);

  async function persistProfile() {
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

    if (headlineDraft.trim().length > 60) {
      Alert.alert("Headline too long", "Keep your headline to 60 characters or fewer.");
      return;
    }

    if (intentsDraft.length === 0 || intentsDraft.length > 3) {
      Alert.alert(
        "Check your intents",
        "Choose between one and three Here for intents.",
      );
      return;
    }

    if (editableModules.length === 0) {
      Alert.alert("Add modules", "Choose at least one current-semester module.");
      return;
    }

    if (skillsDraft.length > 10 || interestsDraft.length > 10) {
      Alert.alert(
        "Too many tags",
        "Keep skills and interests to 10 items each.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const moderationResults = await checkContentBatch([
        {
          key: "headline",
          subjectType: "profile_headline",
          content: headlineDraft,
          subjectId: profile.id,
          sourceTable: "profiles",
          sourceColumn: "headline",
        },
        {
          key: "bio",
          subjectType: "profile_bio",
          content: bioDraft,
          subjectId: profile.id,
          sourceTable: "profiles",
          sourceColumn: "bio",
        },
      ]);

      if (hasBlockedModeration(moderationResults)) {
        setIsModerationAlertVisible(true);
        return;
      }

      if (hasFlaggedModeration(moderationResults)) {
        const confirmed = await confirmFlaggedContent(
          "Your profile text may be hidden behind a warning. Do you still want to save it?",
        );
        if (!confirmed) {
          return;
        }
      }

      await updateEditableProfile(profile.id, {
        displayName: displayNameDraft,
        headline: headlineDraft,
        bio: bioDraft,
        faculty: facultyDraft,
        major: majorDraft,
        yearOfStudy: yearOfStudyDraft,
        hallResidence: hallResidenceDraft,
        studyMode: studyModeDraft,
        studyStyle: studyStyleDraft,
        preferredGroupSize: preferredGroupSizeDraft,
        interests: interestsDraft,
        ccaTags: ccaTagsDraft,
        skills: skillsDraft,
        intents: intentsDraft,
        modules: editableModules,
        timetableSlots: timetableSlotsDraft,
        headlineModerationOutcome:
          moderationResults.headline?.verdict ?? "allowed",
        bioModerationOutcome: moderationResults.bio?.verdict ?? "allowed",
      });
      await upsertPrimaryProfessionalLink(profile.id, professionalLinkDraft);
      const refreshed = await refreshProfile(profile.id);
      if (refreshed) {
        setHeadlineDraft(refreshed.headline ?? "");
      }
      const viewModel = await fetchProfileViewModel(profile.id, refreshed ?? profile);
      setCompletion(viewModel.completion);
      setSection(null);
    } catch (error) {
      Alert.alert(
        "Could not save settings",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCurrentSection() {
    if (!section) {
      return;
    }

    if (section === "ai") {
      setSection(null);
      return;
    }

    if (section === "account") {
      if (!profile) {
        return;
      }

      setIsSaving(true);
      try {
        await updateNudgePreferences(profile.id, nudgePreferencesDraft);
        void evaluateSmartNudges().catch(() => undefined);
        setSection(null);
      } catch (error) {
        Alert.alert(
          "Could not save nudge settings",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setIsSaving(false);
      }
      return;
    }

    await persistProfile();
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
        bio: bioDraft,
        displayName: displayNameDraft,
        headline: headlineDraft,
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
        bio: bioDraft,
        displayName: displayNameDraft,
        headline: headlineDraft,
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

  function toggleIntent(intent: UserProfile["intents"][number]) {
    setIntentsDraft((current) => {
      if (current.includes(intent)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== intent);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, intent];
    });
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

  function addUniqueTag(
    current: string[],
    setCurrent: Dispatch<SetStateAction<string[]>>,
    nextValue: string,
    max: number,
    normalize: (value: string) => string | null,
  ) {
    const normalized = normalize(nextValue);

    if (!normalized || current.includes(normalized) || current.length >= max) {
      return false;
    }

    setCurrent((previous) => [...previous, normalized]);
    return true;
  }

  function addCustomInterest() {
    const added = addUniqueTag(
      interestsDraft,
      setInterestsDraft,
      customInterestInput,
      10,
      normalizeInterestTag,
    );

    if (added) {
      setCustomInterestInput("");
      setInterestSuggestions([]);
    }
  }

  function addCustomSkill() {
    const added = addUniqueTag(
      skillsDraft,
      setSkillsDraft,
      customSkillInput,
      10,
      normalizeProfileTag,
    );

    if (added) {
      setCustomSkillInput("");
    }
  }

  function addCustomCca() {
    const added = addUniqueTag(
      ccaTagsDraft,
      setCcaTagsDraft,
      customCcaInput,
      10,
      normalizeProfileTag,
    );

    if (added) {
      setCustomCcaInput("");
    }
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
      `Matched ${importedClassSlotsPreview.length} lesson slots. Your availability is ready to save.`,
    );
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
        end_minute: endMinute,
        source: "manual",
        start_minute: startMinute,
      };

      const duplicateExists = timetableSlotsDraft.some(
        (slot) =>
          slot.day_of_week === nextSlot.day_of_week &&
          slot.start_minute === nextSlot.start_minute &&
          slot.end_minute === nextSlot.end_minute &&
          slot.source === nextSlot.source,
      );

      if (duplicateExists) {
        Alert.alert("Block already added", "That availability block already exists.");
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
      current.filter(
        (slot) =>
          !(
            slot.day_of_week === slotToRemove.day_of_week &&
            slot.start_minute === slotToRemove.start_minute &&
            slot.end_minute === slotToRemove.end_minute &&
            slot.source === slotToRemove.source
          ),
      ),
    );
  }

  function renderHome() {
    return (
      <>
        <View style={styles.homeHead}>
          <GlassButton style={styles.iconButton} variant="light" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#33333F" />
          </GlassButton>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Card>
          <View style={styles.completionRow}>
            <Text style={styles.completionLabel}>Profile completion</Text>
            <Text style={styles.completionPct}>{completion}%</Text>
          </View>
          <View style={styles.track}>
            <LinearGradient
              colors={["#5A46C8", "#3E37A0"]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={[styles.trackFill, { width: `${completion}%` }]}
            />
          </View>
          <View style={styles.callout}>
            <View style={styles.calloutDot}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.calloutText}>
              Match-scoring fields like Here for, Mods, Skills, and Timetable
              count for more, so filling them gives better recommendations.
            </Text>
          </View>
        </Card>

        <GlassSurface tint="light" radius={22} intensity={35} style={styles.card}>
          <View style={styles.listContainer}>
            {SETTINGS_SECTIONS.map((item, index) => (
              <Pressable
                key={item.key}
                style={[
                  styles.listRow,
                  index === SETTINGS_SECTIONS.length - 1
                    ? styles.lastListRow
                    : null,
                ]}
                onPress={() => setSection(item.key)}
              >
                <View style={styles.listText}>
                  <View style={styles.listTitleRow}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    {item.feeds ? (
                      <View style={styles.matchTag}>
                        <Text style={styles.matchTagText}>MATCHING</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.listSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9A9AAE" />
              </Pressable>
            ))}
          </View>
        </GlassSurface>
      </>
    );
  }

  function renderBasicsSection() {
    return (
      <Card title="PROFILE BASICS">
        <View style={styles.avatarRow}>
          <AppAvatar
            name={displayNameDraft || profile?.display_name || "NUSLink"}
            size={72}
            rounded={false}
            imageUri={avatarPreviewUri}
          />
          <View style={styles.avatarActions}>
            <GlassButton
              disabled={isUpdatingPhoto}
              label={isUpdatingPhoto ? "Updating..." : "Change photo"}
              onPress={() => {
                void handlePickProfilePhoto();
              }}
              variant="dark"
            />
            {avatarPreviewUri ? (
              <GlassButton
                disabled={isUpdatingPhoto}
                label="Remove"
                onPress={() => {
                  void handleRemoveProfilePhoto();
                }}
                variant="light"
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.help}>
          Headline is the short one-line summary under your name. Bio becomes the
          longer About section on your profile.
        </Text>
        <GlassField
          maxLength={60}
          placeholder="Headline"
          value={headlineDraft}
          onChangeText={setHeadlineDraft}
        />
        <GlassField
          placeholder="Display name"
          value={displayNameDraft}
          onChangeText={setDisplayNameDraft}
        />
        <GlassField
          multiline
          maxLength={300}
          placeholder="About you"
          value={bioDraft}
          onChangeText={setBioDraft}
        />
      </Card>
    );
  }

  function renderHereForSection() {
    return (
      <Card title={`INTENT TAGS · ${intentsDraft.length}/3`}>
        <Text style={styles.help}>
          Pick between one and three intents. This stays a high-signal matching
          input.
        </Text>
        <View style={styles.chipRow}>
          {INTENT_OPTIONS.map((intent) => (
            <TogglePill
              key={intent.id}
              isActive={intentsDraft.includes(intent.id)}
              label={intent.label}
              onPress={() => toggleIntent(intent.id)}
            />
          ))}
        </View>
      </Card>
    );
  }

  function renderAcademicsSection() {
    return (
      <>
        <Card title={`MODS THIS SEMESTER · ${editableModules.length}`}>
          <Text style={styles.help}>
            Current-semester modules display on your profile and drive module
            overlap.
          </Text>
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="Search a module code"
              value={moduleQuery}
              onChangeText={setModuleQuery}
            />
          </View>
          {isSearchingModules ? (
            <ActivityIndicator color="#5B4FE0" />
          ) : moduleResults.length > 0 ? (
            <View style={styles.searchResults}>
              {moduleResults.slice(0, 6).map((module) => (
                <Pressable
                  key={module.moduleCode}
                  style={styles.searchResultRow}
                  onPress={() => addModule(module)}
                >
                  <View style={styles.listText}>
                    <Text style={styles.searchResultTitle}>
                      {module.moduleCode}
                    </Text>
                    <Text style={styles.searchResultSub}>{module.title}</Text>
                  </View>
                  <Ionicons name="add" size={18} color="#5B4FE0" />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.chipRow}>
            {editableModules.map((module) => (
              <RemovableChip
                key={module.moduleCode}
                label={module.moduleCode}
                onRemove={() => removeModule(module.moduleCode)}
                variant="module"
              />
            ))}
          </View>
        </Card>

        <Card title="ACADEMIC CONTEXT">
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="Faculty"
              value={facultyDraft}
              onChangeText={setFacultyDraft}
            />
            <GlassField
              keyboardType="number-pad"
              placeholder="Year"
              value={String(yearOfStudyDraft)}
              onChangeText={(value) => {
                const numericYear = Number(value.replace(/\D+/g, ""));
                if (Number.isFinite(numericYear) && numericYear >= 1 && numericYear <= 5) {
                  setYearOfStudyDraft(numericYear);
                } else if (!value) {
                  setYearOfStudyDraft(1);
                }
              }}
            />
          </View>
          <GlassField
            placeholder="Major"
            value={majorDraft}
            onChangeText={setMajorDraft}
          />
        </Card>

        <Card title="STUDY PREFERENCES">
          <Text style={styles.help}>
            We are mapping the redesign onto your existing study preference
            fields, so these use the current app's study-style options.
          </Text>
          <View style={styles.chipRow}>
            {STUDY_STYLE_OPTIONS.map((option) => (
              <TogglePill
                key={option.value}
                isActive={studyStyleDraft === option.value}
                label={option.label}
                onPress={() => {
                  setStudyStyleDraft(option.value);
                  setStudyModeDraft(option.value);
                }}
              />
            ))}
          </View>
          <GlassField
            keyboardType="number-pad"
            placeholder="Preferred group size"
            value={String(preferredGroupSizeDraft)}
            onChangeText={(value) => {
              const numericValue = Number(value.replace(/\D+/g, ""));
              setPreferredGroupSizeDraft(
                Number.isFinite(numericValue) && numericValue > 0
                  ? numericValue
                  : 1,
              );
            }}
          />
        </Card>
      </>
    );
  }

  function renderSkillsSection() {
    return (
      <>
        <Card title={`SKILLS · ${skillsDraft.length}/10`}>
          <Text style={styles.help}>
            Concrete things you can contribute. These feed shared-skills
            matching directly.
          </Text>
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="Add a skill"
              value={customSkillInput}
              onChangeText={setCustomSkillInput}
            />
            <GlassButton label="Add" variant="dark" onPress={addCustomSkill} />
          </View>
          <View style={styles.chipRow}>
            {skillsDraft.map((skill) => (
              <RemovableChip
                key={skill}
                label={skill}
                onRemove={() =>
                  setSkillsDraft((current) =>
                    current.filter((item) => item !== skill),
                  )
                }
              />
            ))}
          </View>
        </Card>

        <Card title={`INTERESTS · ${interestsDraft.length}/10`}>
          <Text style={styles.help}>
            Interests stay visible on your profile and broaden your matching
            context.
          </Text>
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="Add an interest"
              value={customInterestInput}
              onChangeText={setCustomInterestInput}
            />
            <GlassButton
              label="Add"
              variant="dark"
              onPress={addCustomInterest}
            />
          </View>
          {interestSuggestions.length > 0 ? (
            <View style={styles.chipRow}>
              {interestSuggestions.map((suggestion) => (
                <TogglePill
                  key={suggestion}
                  isActive={false}
                  label={suggestion}
                  onPress={() => {
                    if (
                      !interestsDraft.includes(suggestion) &&
                      interestsDraft.length < 10
                    ) {
                      setInterestsDraft((current) => [...current, suggestion]);
                    }
                    setCustomInterestInput("");
                    setInterestSuggestions([]);
                  }}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.chipRow}>
            {interestsDraft.map((interest) => (
              <RemovableChip
                key={interest}
                label={interest}
                onRemove={() =>
                  setInterestsDraft((current) =>
                    current.filter((item) => item !== interest),
                  )
                }
              />
            ))}
          </View>
        </Card>
      </>
    );
  }

  function renderLinksSection() {
    return (
      <>
        <Card title="HALL / RESIDENCE">
          <GlassField
            placeholder="e.g. Tembusu, Kent Ridge Hall"
            value={hallResidenceDraft}
            onChangeText={setHallResidenceDraft}
          />
        </Card>

        <Card title="CCA TAGS">
          <View style={styles.chipRow}>
            {CCA_TAG_OPTIONS.map((tag) => (
              <TogglePill
                key={tag}
                isActive={ccaTagsDraft.includes(tag)}
                label={tag}
                onPress={() =>
                  setCcaTagsDraft((current) =>
                    current.includes(tag)
                      ? current.filter((item) => item !== tag)
                      : [...current, tag],
                  )
                }
              />
            ))}
          </View>
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="Add a custom CCA tag"
              value={customCcaInput}
              onChangeText={setCustomCcaInput}
            />
            <GlassButton label="Add" variant="dark" onPress={addCustomCca} />
          </View>
          <View style={styles.chipRow}>
            {ccaTagsDraft
              .filter(
                (tag) =>
                  !CCA_TAG_OPTIONS.includes(tag as (typeof CCA_TAG_OPTIONS)[number]),
              )
              .map((tag) => (
                <RemovableChip
                  key={tag}
                  label={tag}
                  onRemove={() =>
                    setCcaTagsDraft((current) =>
                      current.filter((item) => item !== tag),
                    )
                  }
                />
              ))}
          </View>
        </Card>

        <Card title="PROFESSIONAL URL">
          <GlassField
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://github.com/username"
            value={professionalLinkDraft}
            onChangeText={setProfessionalLinkDraft}
          />
          <Text style={styles.help}>
            This is stored separately from your main public profile sections for
            now, but it stays editable here.
          </Text>
        </Card>
      </>
    );
  }

  function renderTimetableSection() {
    return (
      <Card title="TIMETABLE AVAILABILITY">
        <Text style={styles.help}>
          Your raw timetable stays private. We only use availability blocks for
          overlap calculations.
        </Text>
        <View style={styles.subCard}>
          <Text style={styles.subCardTitle}>Import from NUSMods</Text>
          <Text style={styles.subCardText}>
            Paste your share URL and we will derive availability from it.
          </Text>
          <GlassField
            placeholder="https://nusmods.com/timetable/sem-1/share..."
            value={timetableShareUrlDraft}
            onChangeText={setTimetableShareUrlDraft}
          />
          <GlassButton
            label={isImportingTimetable ? "Importing..." : "Import share URL"}
            onPress={() => {
              void handleImportTimetable();
            }}
            variant="dark"
          />
          {importedClassSlotsPreview.length > 0 ? (
            <View style={styles.previewPanel}>
              <Text style={styles.previewTitle}>
                Matched {importedClassSlotsPreview.length} lesson slots
              </Text>
              {importedClassSlotsPreview.slice(0, 5).map((slot) => (
                <Text
                  key={`${slot.module_code}-${slot.lesson_type}-${slot.class_no}`}
                  style={styles.previewRow}
                >
                  {formatClassSlotLabel(slot)}
                </Text>
              ))}
              <View style={styles.inlineRow}>
                <GlassButton
                  label="Apply imported availability"
                  onPress={handleApplyImportedAvailability}
                  variant="dark"
                />
                <GlassButton
                  label="Clear"
                  onPress={() => {
                    setImportedAvailabilityPreview([]);
                    setImportedClassSlotsPreview([]);
                    setTimetableShareUrlDraft("");
                  }}
                  variant="light"
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.subCard}>
          <Text style={styles.subCardTitle}>Manual free blocks</Text>
          <View style={styles.chipRow}>
            {DAY_OPTIONS.map((day) => (
              <TogglePill
                key={day.value}
                isActive={manualDayDraft === day.value}
                label={day.label}
                onPress={() => setManualDayDraft(day.value)}
              />
            ))}
          </View>
          <View style={styles.inlineRow}>
            <GlassField
              placeholder="09:00"
              value={manualStartDraft}
              onChangeText={setManualStartDraft}
            />
            <GlassField
              placeholder="11:00"
              value={manualEndDraft}
              onChangeText={setManualEndDraft}
            />
          </View>
          <GlassButton
            label="Add manual block"
            onPress={handleAddManualTimetableBlock}
            variant="dark"
          />
        </View>

        <WeeklyTimetableView
          emptyLabel="No saved availability blocks yet."
          slots={timetableSlotsDraft}
        />
        <View style={styles.chipRow}>
          {timetableSlotsDraft.map((slot) => (
            <RemovableChip
              key={`${slot.day_of_week}-${slot.start_minute}-${slot.end_minute}-${slot.source}`}
              label={`${formatDayOfWeek(slot.day_of_week)} ${formatMinuteOfDay(
                slot.start_minute,
              )}-${formatMinuteOfDay(slot.end_minute)}`}
              onRemove={() => removeTimetableSlot(slot)}
            />
          ))}
        </View>
      </Card>
    );
  }

  function renderAiSection() {
    return (
      <>
        <Card title="AI PROFILE IMPORT">
          <Text style={styles.help}>
            Open the resume import flow, review the extracted data, then save it
            back into the same canonical profile fields used throughout the app.
          </Text>
          <GlassButton
            label="Open import flow"
            onPress={() => {
              router.push("/profile/import-resume" as never);
            }}
            variant="dark"
          />
        </Card>

        {profile ? (
          <Card title="IMPORTED PROFESSIONAL RECORDS">
            <ProfessionalProfileSection editable userId={profile.id} />
          </Card>
        ) : null}
      </>
    );
  }

  function renderAccountSection() {
    return (
      <>
        <NudgePreferencesCard
          disabled={isSaving}
          onChange={setNudgePreferencesDraft}
          preferences={nudgePreferencesDraft}
        />
        <Card title="DELIVERY">
          <PushNotificationsCard />
        </Card>
      </>
    );
  }

  function renderSectionBody() {
    switch (section) {
      case "basics":
        return renderBasicsSection();
      case "herefor":
        return renderHereForSection();
      case "academics":
        return renderAcademicsSection();
      case "skills":
        return renderSkillsSection();
      case "links":
        return renderLinksSection();
      case "timetable":
        return renderTimetableSection();
      case "ai":
        return renderAiSection();
      case "account":
        return renderAccountSection();
      default:
        return null;
    }
  }

  if (!profile || isLoading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
          locations={[0, 0.44, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color="#5B4FE0" size="small" />
          <Text style={styles.loadingText}>Loading settings…</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {section === null ? (
            renderHome()
          ) : (
            <>
              <View style={styles.detailHead}>
                <View style={styles.detailHeadLeft}>
                  <GlassButton
                    style={styles.iconButton}
                    variant="light"
                    onPress={() => setSection(null)}
                  >
                    <Ionicons name="chevron-back" size={18} color="#33333F" />
                  </GlassButton>
                  <Text numberOfLines={1} style={styles.detailTitle}>
                    {SECTION_TITLES[section]}
                  </Text>
                </View>
                <GlassButton
                  label={
                    section === "ai"
                      ? "Done"
                      : isSaving
                        ? "Saving..."
                        : "Save"
                  }
                  onPress={() => {
                    void handleSaveCurrentSection();
                  }}
                  variant="dark"
                />
              </View>
              {renderSectionBody()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <ModerationAlert
        visible={isModerationAlertVisible}
        onClose={() => setIsModerationAlertVisible(false)}
      />
    </View>
  );
}

const CARD_BORDER = "rgba(90,110,180,0.12)";

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#E7EBF7",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  loadingText: {
    color: "#54546A",
    fontSize: 13,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  homeHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  title: {
    color: "#1A1A26",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconButton: {
    height: 40,
    width: 40,
  },
  card: {
    width: "100%",
  },
  cardInner: {
    gap: 12,
    padding: 18,
  },
  sectionLabel: {
    color: "#7A7A8C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  completionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completionLabel: {
    color: "#2A2A38",
    fontSize: 15,
    fontWeight: "600",
  },
  completionPct: {
    color: "#1A1A26",
    fontSize: 19,
    fontWeight: "700",
  },
  track: {
    backgroundColor: "rgba(90,110,180,0.16)",
    borderRadius: 100,
    height: 7,
    overflow: "hidden",
  },
  trackFill: {
    borderRadius: 100,
    height: "100%",
  },
  callout: {
    alignItems: "flex-start",
    backgroundColor: "rgba(230,236,250,0.55)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  calloutDot: {
    alignItems: "center",
    backgroundColor: "rgba(18,19,30,0.9)",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  calloutText: {
    color: "#54546A",
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17.5,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listRow: {
    alignItems: "center",
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 15,
  },
  lastListRow: {
    borderBottomWidth: 0,
  },
  listText: {
    flex: 1,
    gap: 3,
  },
  listTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  listTitle: {
    color: "#22222E",
    fontSize: 15,
    fontWeight: "600",
  },
  listSub: {
    color: "#6E6E80",
    fontSize: 12.5,
  },
  matchTag: {
    backgroundColor: "#E7E3F7",
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  matchTagText: {
    color: "#5B4FA8",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  detailHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  detailHeadLeft: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 10,
  },
  detailTitle: {
    color: "#1A1A26",
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  help: {
    color: "#6E6E80",
    fontSize: 13,
    lineHeight: 18.5,
  },
  field: {
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  fieldTall: {
    minHeight: 110,
  },
  fieldInput: {
    color: "#22222E",
    fontSize: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  fieldInputTall: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  togglePillActive: {
    minHeight: 40,
  },
  togglePillText: {
    color: "#45455A",
    fontSize: 13,
    fontWeight: "500",
  },
  togglePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  removableChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "#DADAE2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  removableChipModule: {
    backgroundColor: "#E6EDFB",
    borderColor: "#CBD8F2",
  },
  removableChipText: {
    color: "#45455A",
    fontSize: 13,
  },
  removableChipTextModule: {
    color: "#3A5FA8",
    fontWeight: "600",
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  avatarActions: {
    gap: 8,
  },
  searchResults: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultRow: {
    alignItems: "center",
    borderBottomColor: CARD_BORDER,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchResultTitle: {
    color: "#22222E",
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultSub: {
    color: "#6E6E80",
    fontSize: 12.5,
  },
  subCard: {
    backgroundColor: "rgba(230,236,250,0.5)",
    borderRadius: 16,
    gap: 12,
    padding: 16,
  },
  subCardTitle: {
    color: "#22222E",
    fontSize: 14,
    fontWeight: "600",
  },
  subCardText: {
    color: "#6E6E80",
    fontSize: 12.5,
    lineHeight: 17.5,
  },
  previewPanel: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 14,
    gap: 8,
    padding: 12,
  },
  previewTitle: {
    color: "#22222E",
    fontSize: 13,
    fontWeight: "600",
  },
  previewRow: {
    color: "#5C6370",
    fontSize: 12.5,
  },
});
