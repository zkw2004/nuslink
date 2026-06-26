import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
} from "@components/shared";
import { fetchConnectedProfiles } from "@services/directMessagesService";
import { useAuthStore, useCommunitiesStore, useGroupsStore } from "@store/index";
import type { ConnectedProfilePreview } from "@appTypes/index";
import { getDiscoverGroupAccess } from "@utils/groupAccess";

function formatGroupTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatCommunityTypeLabel(type: "official" | "user_created") {
  return type === "official" ? "Official" : "Community";
}

function formatPrivacyLabel(privacy: "public" | "semi_private" | "private") {
  switch (privacy) {
    case "semi_private":
      return "Semi-private";
    case "private":
      return "Private";
    default:
      return "Public";
  }
}

function formatRestrictionLabel(
  restriction: "same_module" | "same_year" | "same_faculty" | null,
) {
  switch (restriction) {
    case "same_module":
      return "Same module";
    case "same_year":
      return "Same year";
    case "same_faculty":
      return "Same faculty";
    default:
      return null;
  }
}

type DiscoverMode = "groups" | "communities";

export default function DiscoverScreen() {
  const session = useAuthStore((state) => state.session);
  const groups = useGroupsStore((state) => state.groups);
  const isGroupsLoading = useGroupsStore((state) => state.isLoading);
  const groupsError = useGroupsStore((state) => state.error);
  const joinGroup = useGroupsStore((state) => state.joinGroup);
  const inviteUserToGroup = useGroupsStore((state) => state.inviteUserToGroup);
  const requestToJoinGroup = useGroupsStore((state) => state.requestToJoinGroup);
  const deleteGroup = useGroupsStore((state) => state.deleteGroup);
  const refreshGroups = useGroupsStore((state) => state.refreshGroups);
  const communities = useCommunitiesStore((state) => state.communities);
  const isCommunitiesLoading = useCommunitiesStore((state) => state.isLoading);
  const communitiesError = useCommunitiesStore((state) => state.error);
  const joinCommunity = useCommunitiesStore((state) => state.joinCommunity);
  const refreshCommunities = useCommunitiesStore((state) => state.refreshCommunities);
  const [mode, setMode] = useState<DiscoverMode>("groups");
  const [query, setQuery] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [inviteSearch, setInviteSearch] = useState("");
  const [connectedProfiles, setConnectedProfiles] = useState<ConnectedProfilePreview[]>([]);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  useEffect(() => {
    void refreshGroups(session?.user.id ?? null);
    void refreshCommunities(session?.user.id ?? null);
  }, [refreshCommunities, refreshGroups, session?.user.id]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }

    return groups.filter((group) => {
      return (
        group.name.toLowerCase().includes(normalizedQuery) ||
        group.module_code?.toLowerCase().includes(normalizedQuery) ||
        group.description?.toLowerCase().includes(normalizedQuery) ||
        group.join_note.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [groups, normalizedQuery]);

  const filteredCommunities = useMemo(() => {
    if (!normalizedQuery) {
      return communities;
    }

    return communities.filter((community) => {
      return (
        community.name.toLowerCase().includes(normalizedQuery) ||
        community.description.toLowerCase().includes(normalizedQuery) ||
        community.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [communities, normalizedQuery]);

  const selectedInviteGroup = useMemo(
    () => groups.find((group) => group.id === inviteGroupId) ?? null,
    [groups, inviteGroupId],
  );

  const filteredConnectedProfiles = useMemo(() => {
    const normalizedInviteSearch = inviteSearch.trim().toLowerCase();

    if (!normalizedInviteSearch) {
      return connectedProfiles;
    }

    return connectedProfiles.filter((profile) => {
      return (
        profile.display_name.toLowerCase().includes(normalizedInviteSearch) ||
        profile.major?.toLowerCase().includes(normalizedInviteSearch)
      );
    });
  }, [connectedProfiles, inviteSearch]);

  const titleCopy = useMemo(() => {
    if (mode === "groups") {
      if (isGroupsLoading) {
        return "Loading groups...";
      }

      if (filteredGroups.length === 0) {
        return normalizedQuery ? "No groups match your search" : "No groups yet";
      }

      return `${filteredGroups.length} group${filteredGroups.length === 1 ? "" : "s"} this semester`;
    }

    if (isCommunitiesLoading) {
      return "Loading communities...";
    }

    if (filteredCommunities.length === 0) {
      return normalizedQuery ? "No communities match your search" : "No communities yet";
    }

    return `${filteredCommunities.length} communit${filteredCommunities.length === 1 ? "y" : "ies"} to browse`;
  }, [
    filteredCommunities.length,
    filteredGroups.length,
    isCommunitiesLoading,
    isGroupsLoading,
    mode,
    normalizedQuery,
  ]);

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

  async function handleRequestJoinGroup(groupId: string) {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in again before requesting access.");
      return;
    }

    try {
      await requestToJoinGroup(groupId, session.user.id);
      Alert.alert(
        "Request sent",
        "The group owner will be notified and can approve your request.",
      );
    } catch (error) {
      Alert.alert(
        "Could not request access",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  async function handleOpenInviteModal(groupId: string) {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in before inviting users.");
      return;
    }

    setInviteGroupId(groupId);
    setInviteSearch("");
    setIsInviteLoading(true);

    try {
      const profiles = await fetchConnectedProfiles(session.user.id);
      setConnectedProfiles(profiles);
    } catch (error) {
      Alert.alert(
        "Could not load connections",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsInviteLoading(false);
    }
  }

  async function handleSendGroupInvite(recipientId: string) {
    if (!inviteGroupId) {
      return;
    }

    setInvitingUserId(recipientId);

    try {
      await inviteUserToGroup(inviteGroupId, recipientId);
      Alert.alert("Invitation sent", "The group invitation has been sent.");
      setInviteGroupId(null);
      setInviteSearch("");
    } catch (error) {
      Alert.alert(
        "Could not send invitation",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setInvitingUserId(null);
    }
  }

  async function handleJoinCommunity(communityId: string) {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in again before joining a community.");
      return;
    }

    try {
      await joinCommunity(communityId, session.user.id);
    } catch (joinError) {
      Alert.alert(
        "Could not join community",
        joinError instanceof Error ? joinError.message : "Please try again.",
      );
    }
  }

  function handleDeleteGroup(groupId: string, groupName: string) {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in again before deleting a group.");
      return;
    }

    Alert.alert(
      "Delete group",
      `Delete "${groupName}"? This removes the group from Discover.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroup(groupId, session.user.id);
            } catch (deleteError) {
              Alert.alert(
                "Could not delete group",
                deleteError instanceof Error ? deleteError.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <AppScreenHeader
        title="Discover"
        subtitle="Browse groups and communities for the current semester from one shared surface."
      />

      <Modal
        visible={inviteGroupId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteGroupId(null)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="max-h-[78%] rounded-t-[28px] bg-[#EEF3F9] px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[20px] font-bold text-[#0F1115]">
                  Invite connection
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                  {selectedInviteGroup
                    ? `Send a group invitation for ${selectedInviteGroup.name}.`
                    : "Send a group invitation to one of your connections."}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close invite panel"
                className="rounded-full bg-white px-4 py-2"
                onPress={() => setInviteGroupId(null)}
              >
                <Text className="text-[14px] font-semibold text-[#0F1115]">
                  Close
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={inviteSearch}
              onChangeText={setInviteSearch}
              placeholder="Search connected people"
              placeholderTextColor="#9AA0AB"
              className="mb-4 rounded-[18px] border border-[#D7DEE9] bg-white px-4 py-3 text-[15px] text-[#0F1115]"
            />

            {isInviteLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#5B7BA3" />
              </View>
            ) : filteredConnectedProfiles.length === 0 ? (
              <SectionCard>
                <Text className="text-[16px] font-bold text-[#0F1115]">
                  No connections found
                </Text>
                <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
                  Connect with people first, then invite them to your groups.
                </Text>
              </SectionCard>
            ) : (
              <ScrollView
                className="max-h-[420px]"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-3">
                  {filteredConnectedProfiles.map((profile) => (
                    <SectionCard key={profile.id} className="p-3">
                      <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                          <Text className="text-[16px] font-bold text-[#0F1115]">
                            {profile.display_name}
                          </Text>
                          <Text className="mt-1 text-[13px] text-[#5C6370]">
                            {[profile.major, profile.year_of_study ? `Y${profile.year_of_study}` : null]
                              .filter(Boolean)
                              .join(" · ") || "Connected student"}
                          </Text>
                        </View>
                        <AppButton
                          label={invitingUserId === profile.id ? "Sending..." : "Invite"}
                          disabled={invitingUserId !== null}
                          onPress={() => {
                            void handleSendGroupInvite(profile.id);
                          }}
                        />
                      </View>
                    </SectionCard>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search groups or communities"
            placeholderTextColor="#9AA0AB"
            className="rounded-[14px] border border-[#E4E9F1] bg-[#F9FBFD] px-4 py-4 text-[15px] text-[#0F1115]"
          />

          <View className="mt-3 flex-row rounded-full bg-[#EEF2F7] p-1">
            {([
              { label: "Groups", value: "groups" },
              { label: "Communities", value: "communities" },
            ] as const).map((option) => {
              const isActive = mode === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  className={`flex-1 rounded-full px-4 py-3 ${
                    isActive ? "bg-[#0F1115]" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-center text-[13px] font-semibold ${
                      isActive ? "text-white" : "text-[#5C6370]"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <Text className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.5px] text-[#9AA0AB]">
          {titleCopy}
        </Text>

        {mode === "groups" && groupsError ? (
          <SectionCard className="mb-4">
            <Text className="text-sm leading-6 text-red-700">{groupsError}</Text>
          </SectionCard>
        ) : null}

        {mode === "communities" && communitiesError ? (
          <SectionCard>
            <Text className="text-sm leading-6 text-red-700">{communitiesError}</Text>
          </SectionCard>
        ) : null}

        {mode === "groups" && filteredGroups.length === 0 && !isGroupsLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              {normalizedQuery ? "No groups match your search" : "No groups yet"}
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              {normalizedQuery
                ? "Try a module code, group name, or shorter keyword."
                : "Create the first public, restricted, or invite-only group for this semester."}
            </Text>
          </SectionCard>
        ) : null}

        {mode === "communities" && filteredCommunities.length === 0 && !isCommunitiesLoading ? (
          <SectionCard className="mb-4">
            <Text className="text-[17px] font-bold text-[#0F1115]">
              {normalizedQuery ? "No communities match your search" : "No communities yet"}
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              {normalizedQuery
                ? "Try a club name, interest area, or shorter keyword."
                : "Communities will appear here as persistent spaces for clubs, interests, and semester-spanning collaboration."}
            </Text>
          </SectionCard>
        ) : null}

        {mode === "groups" ? (
          <View className="gap-4">
            {filteredGroups.map((group) => (
              <SectionCard key={group.id} className="overflow-hidden rounded-[20px] p-0">
                {(() => {
                  const groupAccess = getDiscoverGroupAccess(
                    group,
                    session?.user.id,
                  );
                  const restrictionLabel = formatRestrictionLabel(group.restriction);

                  return (
                    <>
                      <View className="gap-3 p-[16px]">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text className="text-[18px] font-bold tracking-[-0.4px] text-[#0F1115]">
                              {group.name}
                            </Text>
                            <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                              {group.description?.trim() ||
                                (group.privacy === "private"
                                  ? "Private group. Request access or wait for an invitation."
                                  : "Group open to eligible students this semester.")}
                            </Text>
                          </View>
                          <AppChip label={formatGroupTypeLabel(group.type)} variant="module" />
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                          {group.module_code ? (
                            <AppChip label={group.module_code} variant="outline" />
                          ) : null}
                          <AppChip label={formatPrivacyLabel(group.privacy)} variant="outline" />
                          {restrictionLabel ? (
                            <AppChip label={restrictionLabel} variant="outline" />
                          ) : null}
                          {groupAccess.isOwner ? <AppChip label="Owner" variant="solid" /> : null}
                          {group.joined ? <AppChip label="Joined" variant="solid" /> : null}
                        </View>
                      </View>

                      <View className="border-t border-[#E4E9F1] bg-[#EEF2F7] px-[16px] py-[12px]">
                        <View className="flex-row items-center gap-[10px]">
                          <Text className="flex-1 text-[12px] text-[#5C6370]">
                            {group.join_note}
                          </Text>

                          <View className="min-w-[104px] flex-row gap-2">
                            {groupAccess.isOwner ? (
                              <>
                                <AppButton
                                  label="Invite"
                                  variant="secondary"
                                  onPress={() => {
                                    void handleOpenInviteModal(group.id);
                                  }}
                                />
                                <AppButton
                                  label="Resources"
                                  variant="secondary"
                                  onPress={() => {
                                    router.push(
                                      `/discover/group/${group.id}/resources` as never,
                                    );
                                  }}
                                />
                                <AppButton
                                  label="Delete"
                                  variant="secondary"
                                  onPress={() => handleDeleteGroup(group.id, group.name)}
                                />
                              </>
                            ) : (
                              <>
                                {group.joined ? (
                                  <AppButton
                                    label="Resources"
                                    variant="secondary"
                                    onPress={() => {
                                      router.push(
                                        `/discover/group/${group.id}/resources` as never,
                                      );
                                    }}
                                  />
                                ) : null}
                                <AppButton
                                  label={groupAccess.actionLabel}
                                  disabled={groupAccess.isActionDisabled}
                                  onPress={() => {
                                    if (group.privacy === "private") {
                                      void handleRequestJoinGroup(group.id);
                                      return;
                                    }

                                    void handleJoinGroup(group.id);
                                  }}
                                />
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </SectionCard>
            ))}
          </View>
        ) : (
          <View className="gap-4">
            {filteredCommunities.map((community) => {
              const isOwner = session?.user.id === community.creator_id;

              return (
                <SectionCard key={community.id} className="overflow-hidden rounded-[20px] p-0">
                  <View className="gap-3 p-[16px]">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold tracking-[-0.4px] text-[#0F1115]">
                          {community.name}
                        </Text>
                        <Text className="mt-1 text-[13px] leading-5 text-[#5C6370]">
                          {community.description.trim() || "Persistent space for club activity, shared interests, and semester-spanning collaboration."}
                        </Text>
                      </View>
                      <AppChip label={formatCommunityTypeLabel(community.type)} variant="module" />
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      <AppChip
                        label={community.join_policy === "open" ? "Open join" : "Approval later"}
                        variant="outline"
                      />
                      {community.tags.map((tag) => (
                        <AppChip key={tag} label={tag} variant="outline" />
                      ))}
                      {isOwner ? <AppChip label="Owner" variant="solid" /> : null}
                      {community.joined ? <AppChip label="Joined" variant="solid" /> : null}
                    </View>
                  </View>

                  <View className="flex-row items-center gap-[10px] border-t border-[#E4E9F1] bg-[#EEF2F7] px-[16px] py-[12px]">
                    <Text className="flex-1 text-[12px] text-[#5C6370]">
                      {isOwner
                        ? "You created this community."
                        : community.joined
                          ? "You are already in this community."
                          : "Open for ongoing club, interest, and peer spaces."}
                    </Text>

                    <View className="min-w-[104px] flex-row gap-2">
                      {community.joined || isOwner ? (
                        <AppButton
                          label="Open chat"
                          variant="secondary"
                          onPress={() => {
                            router.push(`/chats/community/${community.id}` as never);
                          }}
                        />
                      ) : (
                        <AppButton
                          label="Join"
                          disabled={community.join_policy !== "open"}
                          onPress={() => {
                            void handleJoinCommunity(community.id);
                          }}
                        />
                      )}
                    </View>
                  </View>
                </SectionCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
