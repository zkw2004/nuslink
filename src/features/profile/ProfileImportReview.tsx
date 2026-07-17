import { useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "@components/shared";
import {
  applyProfileImport,
  type ExtractedProfileEntry,
  type ExtractedProfileItem,
  type ExtractedProfileLink,
  type ProfileExtractionDraft,
} from "@services/profileExtractionService";
import { useAuthStore } from "@store/index";

function ReviewCard({
  selected,
  evidence,
  children,
  onToggle,
}: {
  selected: boolean;
  evidence: string | null;
  children: ReactNode;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`rounded-2xl border p-4 ${
        selected
          ? "border-[#617BA3] bg-[#EDF3FB]"
          : "border-white/70 bg-white/40"
      }`}
      onPress={onToggle}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
            selected
              ? "border-[#334D73] bg-[#334D73]"
              : "border-[#98A4B5] bg-white/70"
          }`}
        >
          {selected ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : null}
        </View>
        <View className="flex-1">
          {children}
          {evidence ? (
            <Text className="mt-2 text-[11px] leading-4 text-[#70798A]">
              Evidence: {evidence}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View>
      <Text className="text-[16px] font-bold text-[#171923]">{title}</Text>
      {description ? (
        <Text className="mt-1 text-[12px] leading-5 text-[#687183]">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function EditableTagList({
  items,
  selected,
  onChangeItem,
  onToggleItem,
}: {
  items: ExtractedProfileItem[];
  selected: boolean[];
  onChangeItem: (index: number, value: string) => void;
  onToggleItem: (index: number) => void;
}) {
  return (
    <View className="gap-2">
      {items.map((item, index) => (
        <ReviewCard
          key={`${index}-${item.value}`}
          selected={selected[index] ?? false}
          evidence={item.evidence}
          onToggle={() => onToggleItem(index)}
        >
          <TextInput
            className="rounded-xl bg-white/70 px-3 py-2 text-[14px] font-semibold text-[#171923]"
            value={item.value}
            maxLength={100}
            onChangeText={(value) => onChangeItem(index, value)}
            onPressIn={(event) => event.stopPropagation()}
          />
        </ReviewCard>
      ))}
    </View>
  );
}

function VisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      className={`mt-3 self-start rounded-full px-3 py-2 ${
        visible ? "bg-[#334D73]" : "bg-[#DDE4EE]"
      }`}
      onPress={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <Text
        className={`text-[11px] font-bold ${
          visible ? "text-white" : "text-[#536174]"
        }`}
      >
        {visible ? "Visible on profile" : "Private to you"}
      </Text>
    </Pressable>
  );
}

function toggleAt(values: boolean[], index: number) {
  return values.map((value, currentIndex) =>
    currentIndex === index ? !value : value,
  );
}

export function ProfileImportReview({
  initialDraft,
}: {
  initialDraft: ProfileExtractionDraft;
}) {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [draft, setDraft] = useState(initialDraft);
  const [selectedBio, setSelectedBio] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(
    initialDraft.skills.map(() => false),
  );
  const [selectedInterests, setSelectedInterests] = useState(
    initialDraft.interests.map(() => false),
  );
  const [selectedCcaTags, setSelectedCcaTags] = useState(
    initialDraft.cca_tags.map(() => false),
  );
  const [selectedLinks, setSelectedLinks] = useState(
    initialDraft.professional_links.map(() => false),
  );
  const [visibleLinks, setVisibleLinks] = useState(
    initialDraft.professional_links.map(() => false),
  );
  const [selectedEntries, setSelectedEntries] = useState(
    initialDraft.entries.map(() => false),
  );
  const [visibleEntries, setVisibleEntries] = useState(
    initialDraft.entries.map(() => false),
  );
  const [isSaving, setIsSaving] = useState(false);

  const selectedCount = useMemo(
    () =>
      Number(selectedBio) +
      selectedSkills.filter(Boolean).length +
      selectedInterests.filter(Boolean).length +
      selectedCcaTags.filter(Boolean).length +
      selectedLinks.filter(Boolean).length +
      selectedEntries.filter(Boolean).length,
    [
      selectedBio,
      selectedCcaTags,
      selectedEntries,
      selectedInterests,
      selectedLinks,
      selectedSkills,
    ],
  );

  function updateTag(
    key: "skills" | "interests" | "cca_tags",
    index: number,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, currentIndex) =>
        currentIndex === index ? { ...item, value } : item,
      ),
    }));
  }

  function updateLink(index: number, updates: Partial<ExtractedProfileLink>) {
    setDraft((current) => ({
      ...current,
      professional_links: current.professional_links.map(
        (item, currentIndex) =>
          currentIndex === index ? { ...item, ...updates } : item,
      ),
    }));
  }

  function updateEntry(index: number, updates: Partial<ExtractedProfileEntry>) {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...updates } : item,
      ),
    }));
  }

  async function handleSave() {
    if (!profile || selectedCount === 0) {
      return;
    }

    const selectedTagValues = [
      ...draft.skills.filter((_, index) => selectedSkills[index]),
      ...draft.interests.filter((_, index) => selectedInterests[index]),
      ...draft.cca_tags.filter((_, index) => selectedCcaTags[index]),
    ];
    if (selectedTagValues.some((item) => !item.value.trim())) {
      Alert.alert("Check selected tags", "Selected tags cannot be empty.");
      return;
    }

    if (selectedBio && !draft.suggested_bio?.trim()) {
      Alert.alert("Check your bio", "The selected bio cannot be empty.");
      return;
    }

    const links = draft.professional_links
      .map((link, index) => ({ link, index }))
      .filter(({ index }) => selectedLinks[index])
      .map(({ link, index }) => ({
        ...link,
        isVisible: visibleLinks[index] ?? false,
      }));
    if (
      links.some(
        (link) =>
          !link.url.startsWith("https://") &&
          !link.url.startsWith("http://"),
      )
    ) {
      Alert.alert(
        "Check professional links",
        "Selected links must start with http:// or https://.",
      );
      return;
    }

    const entries = draft.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ index }) => selectedEntries[index])
      .map(({ entry, index }) => ({
        ...entry,
        isVisible: visibleEntries[index] ?? false,
      }));
    if (entries.some((entry) => !entry.title.trim())) {
      Alert.alert("Check selected entries", "Every selected entry needs a title.");
      return;
    }

    setIsSaving(true);
    try {
      await applyProfileImport(profile, {
        bio: selectedBio ? draft.suggested_bio : null,
        skills: selectedSkills.some(Boolean)
          ? draft.skills
              .filter((_, index) => selectedSkills[index])
              .map((item) => item.value)
          : null,
        interests: selectedInterests.some(Boolean)
          ? draft.interests
              .filter((_, index) => selectedInterests[index])
              .map((item) => item.value)
          : null,
        ccaTags: selectedCcaTags.some(Boolean)
          ? draft.cca_tags
              .filter((_, index) => selectedCcaTags[index])
              .map((item) => item.value)
          : null,
        links,
        entries,
      });
      await refreshProfile(profile.id);
      Alert.alert("Profile updated", "Your selected resume details were saved.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not save profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {draft.warnings.length > 0 ? (
        <View className="rounded-2xl border border-[#E5C875] bg-[#FFF8D9] p-4">
          <Text className="text-[13px] font-bold text-[#705A1B]">
            Check these details
          </Text>
          {draft.warnings.map((warning) => (
            <Text
              key={warning}
              className="mt-1 text-[12px] leading-5 text-[#705A1B]"
            >
              • {warning}
            </Text>
          ))}
        </View>
      ) : null}

      {draft.suggested_bio ? (
        <View className="gap-3">
          <SectionTitle
            title="Suggested bio"
            description="Selecting this replaces your current bio."
          />
          <ReviewCard
            selected={selectedBio}
            evidence={null}
            onToggle={() => setSelectedBio((current) => !current)}
          >
            <TextInput
              className="min-h-[86px] rounded-xl bg-white/70 px-3 py-3 text-[14px] leading-5 text-[#171923]"
              value={draft.suggested_bio}
              maxLength={200}
              multiline
              textAlignVertical="top"
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  suggested_bio: value,
                }))
              }
              onPressIn={(event) => event.stopPropagation()}
            />
            <Text className="mt-1 text-right text-[10px] text-[#7A8392]">
              {draft.suggested_bio.length}/200
            </Text>
          </ReviewCard>
        </View>
      ) : null}

      {draft.skills.length > 0 ? (
        <View className="gap-3">
          <SectionTitle
            title="Skills"
            description="Selected skills merge with your current tags."
          />
          <EditableTagList
            items={draft.skills}
            selected={selectedSkills}
            onChangeItem={(index, value) => updateTag("skills", index, value)}
            onToggleItem={(index) =>
              setSelectedSkills((current) => toggleAt(current, index))
            }
          />
        </View>
      ) : null}

      {draft.interests.length > 0 ? (
        <View className="gap-3">
          <SectionTitle
            title="Interests"
            description="Selected interests merge with your current profile."
          />
          <EditableTagList
            items={draft.interests}
            selected={selectedInterests}
            onChangeItem={(index, value) => updateTag("interests", index, value)}
            onToggleItem={(index) =>
              setSelectedInterests((current) => toggleAt(current, index))
            }
          />
        </View>
      ) : null}

      {draft.cca_tags.length > 0 ? (
        <View className="gap-3">
          <SectionTitle title="CCA and organisations" />
          <EditableTagList
            items={draft.cca_tags}
            selected={selectedCcaTags}
            onChangeItem={(index, value) => updateTag("cca_tags", index, value)}
            onToggleItem={(index) =>
              setSelectedCcaTags((current) => toggleAt(current, index))
            }
          />
        </View>
      ) : null}

      {draft.professional_links.length > 0 ? (
        <View className="gap-3">
          <SectionTitle
            title="Professional links"
            description="Imported records stay private unless you explicitly make them visible."
          />
          {draft.professional_links.map((link, index) => (
            <ReviewCard
              key={`${link.label}-${index}`}
              selected={selectedLinks[index] ?? false}
              evidence={link.evidence}
              onToggle={() =>
                setSelectedLinks((current) => toggleAt(current, index))
              }
            >
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.5px] text-[#687183]">
                {link.label}
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-[#171923]"
                value={link.url}
                onChangeText={(url) => updateLink(index, { url })}
                onPressIn={(event) => event.stopPropagation()}
              />
              {selectedLinks[index] ? (
                <VisibilityToggle
                  visible={visibleLinks[index] ?? false}
                  onToggle={() =>
                    setVisibleLinks((current) => toggleAt(current, index))
                  }
                />
              ) : null}
            </ReviewCard>
          ))}
        </View>
      ) : null}

      {draft.entries.length > 0 ? (
        <View className="gap-3">
          <SectionTitle
            title="Experience, projects and competitions"
            description="Edit the draft, then choose what to save and what others can see."
          />
          {draft.entries.map((entry, index) => (
            <ReviewCard
              key={`${entry.category}-${index}`}
              selected={selectedEntries[index] ?? false}
              evidence={entry.evidence}
              onToggle={() =>
                setSelectedEntries((current) => toggleAt(current, index))
              }
            >
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.5px] text-[#687183]">
                {entry.category}
              </Text>
              <View className="gap-2">
                <TextInput
                  className="rounded-xl bg-white/70 px-3 py-2 text-[14px] font-semibold text-[#171923]"
                  value={entry.title}
                  maxLength={140}
                  placeholder="Title"
                  onChangeText={(title) => updateEntry(index, { title })}
                  onPressIn={(event) => event.stopPropagation()}
                />
                <TextInput
                  className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-[#171923]"
                  value={entry.organization ?? ""}
                  maxLength={140}
                  placeholder="Organisation"
                  onChangeText={(organization) =>
                    updateEntry(index, { organization })
                  }
                  onPressIn={(event) => event.stopPropagation()}
                />
                <TextInput
                  className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-[#171923]"
                  value={entry.date_label ?? ""}
                  maxLength={80}
                  placeholder="Date or period"
                  onChangeText={(date_label) =>
                    updateEntry(index, { date_label })
                  }
                  onPressIn={(event) => event.stopPropagation()}
                />
                <TextInput
                  className="min-h-[76px] rounded-xl bg-white/70 px-3 py-2 text-[13px] leading-5 text-[#171923]"
                  value={entry.description ?? ""}
                  maxLength={500}
                  multiline
                  placeholder="Description"
                  textAlignVertical="top"
                  onChangeText={(description) =>
                    updateEntry(index, { description })
                  }
                  onPressIn={(event) => event.stopPropagation()}
                />
              </View>
              {selectedEntries[index] ? (
                <VisibilityToggle
                  visible={visibleEntries[index] ?? false}
                  onToggle={() =>
                    setVisibleEntries((current) => toggleAt(current, index))
                  }
                />
              ) : null}
            </ReviewCard>
          ))}
        </View>
      ) : null}

      <View className="rounded-2xl bg-white/45 p-4">
        <Text className="text-[12px] leading-5 text-[#606A7B]">
          Nothing is selected automatically. Only the {selectedCount} selected
          item{selectedCount === 1 ? "" : "s"} will be saved.
        </Text>
      </View>
      <AppButton
        label={isSaving ? "Saving..." : `Save selected (${selectedCount})`}
        disabled={isSaving || selectedCount === 0}
        onPress={() => {
          void handleSave();
        }}
      />
    </>
  );
}
