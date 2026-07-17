import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  deleteProfileEntry,
  deleteProfileLink,
  fetchProfessionalProfile,
  setProfileEntryVisibility,
  setProfileLinkVisibility,
  type ProfessionalProfile,
} from "@services/profileExtractionService";
import type { ProfileEntryCategory } from "@appTypes/index";

const CATEGORY_LABELS: Record<ProfileEntryCategory, string> = {
  work: "Experience",
  project: "Projects",
  competition: "Competitions",
};

function formatLinkLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ProfessionalProfileSection({
  userId,
  editable = false,
}: {
  userId: string;
  editable?: boolean;
}) {
  const [professionalProfile, setProfessionalProfile] =
    useState<ProfessionalProfile>({ links: [], entries: [] });
  const [isUpdating, setIsUpdating] = useState(false);

  const loadProfile = useCallback(async () => {
    const result = await fetchProfessionalProfile(userId);
    setProfessionalProfile(result);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void fetchProfessionalProfile(userId)
        .then((result) => {
          if (isActive) {
            setProfessionalProfile(result);
          }
        })
        .catch(() => {
          if (isActive) {
            setProfessionalProfile({ links: [], entries: [] });
          }
        });

      return () => {
        isActive = false;
      };
    }, [userId]),
  );

  async function updateItem(action: () => Promise<void>) {
    setIsUpdating(true);
    try {
      await action();
      await loadProfile();
    } catch (error) {
      Alert.alert(
        "Could not update profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  if (
    professionalProfile.links.length === 0 &&
    professionalProfile.entries.length === 0
  ) {
    return (
      <Text className="text-[13px] leading-5 text-[#5C6370]">
        Import a resume to add professional links, experience, projects, and
        competitions.
      </Text>
    );
  }

  return (
    <View className="gap-4">
      {professionalProfile.links.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {professionalProfile.links.map((link) => (
            <View key={link.id} className="gap-2">
              <Pressable
                accessibilityRole="link"
                className="flex-row items-center gap-1.5 rounded-full bg-[#E2EAF5] px-3 py-2"
                onPress={() => {
                  void Linking.openURL(link.url);
                }}
              >
                <Ionicons name="link-outline" size={13} color="#445E82" />
                <Text className="text-[12px] font-semibold text-[#445E82]">
                  {formatLinkLabel(link.label)}
                  {!link.is_visible ? " · Private" : ""}
                </Text>
              </Pressable>
              {editable ? (
                <View className="flex-row gap-2">
                  <Pressable
                    disabled={isUpdating}
                    className="rounded-full bg-white/60 px-3 py-1.5"
                    onPress={() => {
                      void updateItem(() =>
                        setProfileLinkVisibility(link.id, !link.is_visible),
                      );
                    }}
                  >
                    <Text className="text-[10px] font-bold text-[#536174]">
                      {link.is_visible ? "Make private" : "Make visible"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={isUpdating}
                    className="rounded-full bg-[#F5E1E4] px-3 py-1.5"
                    onPress={() => {
                      Alert.alert("Delete link?", link.url, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            void updateItem(() => deleteProfileLink(link.id));
                          },
                        },
                      ]);
                    }}
                  >
                    <Text className="text-[10px] font-bold text-[#9A3F4D]">
                      Delete
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {(["work", "project", "competition"] as const).map((category) => {
        const entries = professionalProfile.entries.filter(
          (entry) => entry.category === category,
        );
        if (entries.length === 0) {
          return null;
        }

        return (
          <View key={category} className="gap-2">
            <Text className="text-[12px] font-bold uppercase tracking-[0.5px] text-[#747E8E]">
              {CATEGORY_LABELS[category]}
            </Text>
            {entries.map((entry) => (
              <View
                key={entry.id}
                className="rounded-2xl border border-white/70 bg-white/45 p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-[#171923]">
                      {entry.title}
                    </Text>
                    {entry.organization || entry.date_label ? (
                      <Text className="mt-1 text-[12px] text-[#667083]">
                        {[entry.organization, entry.date_label]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                  {!entry.is_visible ? (
                    <Text className="rounded-full bg-[#E3E7EE] px-2 py-1 text-[10px] font-bold text-[#687183]">
                      Private
                    </Text>
                  ) : null}
                </View>
                {entry.description ? (
                  <Text className="mt-2 text-[13px] leading-5 text-[#4F596A]">
                    {entry.description}
                  </Text>
                ) : null}
                {editable ? (
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      disabled={isUpdating}
                      className="rounded-full bg-[#E3E8F0] px-3 py-1.5"
                      onPress={() => {
                        void updateItem(() =>
                          setProfileEntryVisibility(entry.id, !entry.is_visible),
                        );
                      }}
                    >
                      <Text className="text-[10px] font-bold text-[#536174]">
                        {entry.is_visible ? "Make private" : "Make visible"}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isUpdating}
                      className="rounded-full bg-[#F5E1E4] px-3 py-1.5"
                      onPress={() => {
                        Alert.alert("Delete entry?", entry.title, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                              void updateItem(() =>
                                deleteProfileEntry(entry.id),
                              );
                            },
                          },
                        ]);
                      }}
                    >
                      <Text className="text-[10px] font-bold text-[#9A3F4D]">
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
