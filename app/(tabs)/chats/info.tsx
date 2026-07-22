import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GlassButton, GlassSurface } from "@components/shared";
import { LeaveGroupReviewPrompt } from "@components/reviews/LeaveGroupReviewPrompt";
import { MemberReviewRow } from "@components/reviews/MemberReviewRow";
import { ReviewComposerSheet } from "@components/reviews/ReviewComposerSheet";
import type {
  ChatAttachmentKind,
  ChatMeetup,
  ChatPoll,
  CommunityChatMessage,
  DirectMessage,
  GroupChatMessage,
  ReviewComposerTarget,
  ReviewableGroupMember,
} from "@appTypes/index";
import {
  fetchGroupReviewableMembers,
  getGroupReviewEligibility,
} from "@services/index";
import { getEligibleLeavePromptMembers } from "@utils/reviewFlow";
import {
  useAuthStore,
  useChatFeaturesStore,
  useCommunityMessagesStore,
  useDirectMessagesStore,
  useGroupMessagesStore,
} from "@store/index";
import { extractLinksFromText, formatAttachmentSize } from "@utils/chatMedia";

const TILE_PALETTE = [
  ["#B9C6EA", "#8495CA"],
  ["#F0A6C6", "#C96E9A"],
  ["#F7CF62", "#EAA31F"],
  ["#8CC1E3", "#4C87B0"],
] as const;

type MediaTab = "Photos" | "Videos" | "Files" | "Audio" | "Links" | "Polls";

type MessageWithMedia = DirectMessage | GroupChatMessage | CommunityChatMessage;

type ChatMediaItem = {
  id: string;
  title: string;
  subtitle: string | null;
  url: string | null;
  kind: ChatAttachmentKind | "link" | "poll";
  created_at: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAttachmentSubtitle(message: MessageWithMedia) {
  if (message.attachment_kind === "image") {
    return "Photo";
  }

  if (message.attachment_kind === "video") {
    return "Video";
  }

  if (message.attachment_kind === "audio") {
    return "Audio";
  }

  return formatAttachmentSize(message.attachment_size) ?? "File";
}

function getMediaCollections(messages: MessageWithMedia[], polls: ChatPoll[]) {
  const photos: ChatMediaItem[] = [];
  const videos: ChatMediaItem[] = [];
  const files: ChatMediaItem[] = [];
  const audio: ChatMediaItem[] = [];
  const links: ChatMediaItem[] = [];

  for (const message of messages) {
    if (message.attachment_url && message.attachment_kind) {
      const item: ChatMediaItem = {
        id: message.id,
        title: message.attachment_name ?? "Attachment",
        subtitle: getAttachmentSubtitle(message),
        url: message.attachment_url,
        kind: message.attachment_kind,
        created_at: message.created_at,
      };

      if (message.attachment_kind === "image") {
        photos.push(item);
      } else if (message.attachment_kind === "video") {
        videos.push(item);
      } else if (message.attachment_kind === "audio") {
        audio.push(item);
      } else {
        files.push(item);
      }
    }

    for (const url of extractLinksFromText(message.body)) {
      links.push({
        id: `${message.id}:${url}`,
        title: url.replace(/^https?:\/\//i, ""),
        subtitle: "Link",
        url,
        kind: "link",
        created_at: message.created_at,
      });
    }
  }

  return {
    Photos: photos,
    Videos: videos,
    Files: files,
    Audio: audio,
    Links: links,
    Polls: polls.map((poll) => ({
      id: poll.id,
      title: poll.question,
      subtitle: `${poll.options.length} options`,
      url: null,
      kind: "poll" as const,
      created_at: poll.created_at,
    })),
  } satisfies Record<MediaTab, ChatMediaItem[]>;
}

function Action({
  icon,
  label,
  danger,
  onPress,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
  width: number;
}) {
  const color = danger ? "#D2483F" : "#3F57B8";

  return (
    <GlassButton
      radius={20}
      variant="light"
      style={[styles.action, { width }]}
      onPress={onPress}
    >
      <View style={styles.actionContent}>
        <Ionicons name={icon} size={23} color={color} />
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      </View>
    </GlassButton>
  );
}

function MediaTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: MediaTab;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.mediaTab,
        active ? styles.mediaTabActive : styles.mediaTabInactive,
      ]}
    >
      <Text
        style={[styles.mediaTabText, active ? styles.mediaTabTextActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ChatInfoScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = params.kind;
  const id = typeof params.id === "string" ? params.id : "";
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const currentUserId = session?.user.id ?? null;
  const contentWidth = Math.max(screenWidth - 48, 0);
  const actionWidth = (contentWidth - 24) / 3;
  const tileSize = (contentWidth - 16) / 3;

  const conversations = useDirectMessagesStore((state) => state.conversations);
  const archivedConversations = useDirectMessagesStore(
    (state) => state.archivedConversations,
  );
  const muteConversations = useDirectMessagesStore(
    (state) => state.muteConversations,
  );
  const deleteConversations = useDirectMessagesStore(
    (state) => state.deleteConversations,
  );

  const groupChats = useGroupMessagesStore((state) => state.groupChats);
  const archivedGroupChats = useGroupMessagesStore(
    (state) => state.archivedGroupChats,
  );
  const muteGroupChats = useGroupMessagesStore((state) => state.muteGroupChats);
  const deleteGroupChats = useGroupMessagesStore(
    (state) => state.deleteGroupChats,
  );

  const communityChats = useCommunityMessagesStore(
    (state) => state.communityChats,
  );
  const archivedCommunityChats = useCommunityMessagesStore(
    (state) => state.archivedCommunityChats,
  );
  const messagesByConversation = useDirectMessagesStore(
    (state) => state.messagesByConversation,
  );
  const messagesByGroup = useGroupMessagesStore(
    (state) => state.messagesByGroup,
  );
  const messagesByCommunity = useCommunityMessagesStore(
    (state) => state.messagesByCommunity,
  );
  const pollsByMessageId = useChatFeaturesStore(
    (state) => state.pollsByMessageId,
  );
  const meetupsByMessageId = useChatFeaturesStore(
    (state) => state.meetupsByMessageId,
  );
  const muteCommunityChats = useCommunityMessagesStore(
    (state) => state.muteCommunityChats,
  );
  const deleteCommunityChats = useCommunityMessagesStore(
    (state) => state.deleteCommunityChats,
  );

  const chat = useMemo(() => {
    if (kind === "direct") {
      const conversation = [...conversations, ...archivedConversations].find(
        (item) => item.id === id,
      );

      if (!conversation) {
        return null;
      }

      return {
        id,
        name: conversation.other_user.display_name,
        subtitle: "online",
        initials: getInitials(conversation.other_user.display_name) || "DM",
        muted: conversation.muted_at !== null,
        isGroup: false,
      };
    }

    if (kind === "group") {
      const group = [...groupChats, ...archivedGroupChats].find(
        (item) => item.id === id,
      );

      if (!group) {
        return null;
      }

      return {
        id,
        name: group.name,
        subtitle: "group chat",
        initials: getInitials(group.name) || "G",
        muted: group.muted_at !== null,
        isGroup: true,
      };
    }

    const community = [...communityChats, ...archivedCommunityChats].find(
      (item) => item.id === id,
    );

    if (!community) {
      return null;
    }

    return {
      id,
      name: community.name,
      subtitle: "community group",
      initials: getInitials(community.name) || "C",
      muted: community.muted_at !== null,
      isGroup: true,
    };
  }, [
    archivedCommunityChats,
    archivedConversations,
    archivedGroupChats,
    communityChats,
    conversations,
    groupChats,
    id,
    kind,
  ]);

  const [activeTab, setActiveTab] = useState<MediaTab>("Photos");
  const tabs = chat?.isGroup
    ? (["Photos", "Videos", "Files", "Audio", "Links", "Polls"] as const)
    : (["Photos", "Videos", "Files", "Audio", "Links"] as const);
  const gridMode =
    activeTab === "Photos" || activeTab === "Videos" || activeTab === "Polls";
  const chatMessages = useMemo<MessageWithMedia[]>(() => {
    if (kind === "direct") {
      return messagesByConversation[id] ?? [];
    }

    if (kind === "group") {
      return messagesByGroup[id] ?? [];
    }

    return messagesByCommunity[id] ?? [];
  }, [id, kind, messagesByCommunity, messagesByConversation, messagesByGroup]);
  const chatPolls = useMemo(
    () =>
      chatMessages
        .map((message) => pollsByMessageId[message.id])
        .filter((poll): poll is ChatPoll => Boolean(poll)),
    [chatMessages, pollsByMessageId],
  );
  const latestConfirmedMeetup = useMemo(() => {
    const confirmedMeetups = chatMessages
      .map((message) => meetupsByMessageId[message.id])
      .filter(
        (meetup): meetup is ChatMeetup =>
          Boolean(meetup) && meetup.status === "closed_confirmed",
      )
      .sort(
        (left, right) =>
          new Date(right.closed_at ?? right.created_at).getTime() -
          new Date(left.closed_at ?? left.created_at).getTime(),
      );

    return confirmedMeetups[0] ?? null;
  }, [chatMessages, meetupsByMessageId]);
  const mediaCollections = useMemo(
    () => getMediaCollections(chatMessages, chatPolls),
    [chatMessages, chatPolls],
  );
  const activeMediaItems = mediaCollections[activeTab];
  const [groupMembers, setGroupMembers] = useState<ReviewableGroupMember[]>([]);
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(null);
  const [composerTarget, setComposerTarget] = useState<ReviewComposerTarget | null>(
    null,
  );
  const [leavePromptVisible, setLeavePromptVisible] = useState(false);
  const [leavePromptMembers, setLeavePromptMembers] = useState<ReviewableGroupMember[]>(
    [],
  );
  const [reviewRefreshToken, setReviewRefreshToken] = useState(0);

  const reviewableMembers = useMemo(
    () =>
      groupMembers.filter((member) => member.id !== session?.user.id),
    [groupMembers, session?.user.id],
  );

  useEffect(() => {
    let isActive = true;

    async function loadMembers() {
      if (kind !== "group" || !id) {
        if (isActive) {
          setGroupMembers([]);
        }
        return;
      }

      setIsLoadingGroupMembers(true);
      setGroupMembersError(null);

      try {
        const members = await fetchGroupReviewableMembers(id);
        if (isActive) {
          setGroupMembers(members);
          setGroupMembersError(null);
        }
      } catch (error) {
        if (isActive) {
          setGroupMembers([]);
          setGroupMembersError(
            error instanceof Error ? error.message : "Could not load group members.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingGroupMembers(false);
        }
      }
    }

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [id, kind]);

  async function loadGroupMembers() {
    if (kind !== "group" || !id) {
      return [] as ReviewableGroupMember[];
    }

    setIsLoadingGroupMembers(true);
    setGroupMembersError(null);

    try {
      const members = await fetchGroupReviewableMembers(id);
      setGroupMembers(members);
      setGroupMembersError(null);
      return members;
    } catch (error) {
      setGroupMembersError(
        error instanceof Error ? error.message : "Could not load group members.",
      );
      throw error;
    } finally {
      setIsLoadingGroupMembers(false);
    }
  }

  async function loadEligibleLeavePromptMembers(members: ReviewableGroupMember[]) {
    if (kind !== "group" || !id) {
      return [] as ReviewableGroupMember[];
    }

    const eligibilityResults = await Promise.all(
      members.map(async (member) => {
        const state = await getGroupReviewEligibility(id, member.id);
        return {
          member,
          state,
        };
      }),
    );

    return getEligibleLeavePromptMembers(eligibilityResults);
  }

  async function handleMute() {
    if (!session?.user.id || !chat) {
      return;
    }

    const nextMuted = !chat.muted;

    if (kind === "direct") {
      await muteConversations([chat.id], session.user.id, nextMuted);
    } else if (kind === "group") {
      await muteGroupChats([chat.id], session.user.id, nextMuted);
    } else {
      await muteCommunityChats([chat.id], session.user.id, nextMuted);
    }
  }

  function handleDeleteOrLeave() {
    if (!session?.user.id || !chat) {
      return;
    }

    function confirmGroupLeave(message: string) {
      Alert.alert("Leave chat?", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void proceedWithLeave();
          },
        },
      ]);
    }

    async function proceedWithLeave() {
      if (!currentUserId || !chat) {
        return;
      }

      await deleteGroupChats([chat.id], currentUserId);
      router.replace("/(tabs)/chats");
    }

    async function handleGroupLeave() {
      try {
        const members =
          reviewableMembers.length > 0 ? reviewableMembers : await loadGroupMembers();
        const eligibleMembers = await loadEligibleLeavePromptMembers(
          members.filter((member) => member.id !== currentUserId),
        );

        if (eligibleMembers.length > 0) {
          setLeavePromptMembers(eligibleMembers);
          setLeavePromptVisible(true);
          return;
        }
      } catch {
        confirmGroupLeave(
          "We could not check whether any pending reviews are available. You can still leave this group now.",
        );
        return;
      }

      confirmGroupLeave(
        "You will leave this group/community. Other members keep the chat.",
      );
    }

    if (kind === "group") {
      void handleGroupLeave();
      return;
    }

    Alert.alert(
      chat.isGroup ? "Leave chat?" : "Delete chat?",
      chat.isGroup
        ? "You will leave this group/community. Other members keep the chat."
        : "This deletes the DM chat for both users.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: chat.isGroup ? "Leave" : "Delete",
          style: "destructive",
          onPress: () => {
            if (!session?.user.id) {
              return;
            }

            if (kind === "direct") {
              void deleteConversations([chat.id], session.user.id).then(() =>
                router.replace("/(tabs)/chats"),
              );
            } else {
              void deleteCommunityChats([chat.id], session.user.id).then(() =>
                router.replace("/(tabs)/chats"),
              );
            }
          },
        },
      ],
    );
  }

  async function handleReviewSubmitted() {
    setReviewRefreshToken((current) => current + 1);
    const refreshedMembers = await loadGroupMembers();

    if (leavePromptVisible) {
      const eligibleMembers = await loadEligibleLeavePromptMembers(
        refreshedMembers.filter((member) => member.id !== currentUserId),
      );
      setLeavePromptMembers(eligibleMembers);

      if (eligibleMembers.length === 0) {
        setLeavePromptVisible(false);
      }
    }
  }

  return (
    <View style={styles.root}>
      <BlurView tint="light" intensity={55} style={StyleSheet.absoluteFill} />
      <View style={styles.backdropTint} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
      />
      <View
        style={[styles.content, { paddingTop: Math.max(insets.top + 12, 54) }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.topbar}>
            <GlassButton
              variant="light"
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={17} color="#33333F" />
            </GlassButton>
            <GlassButton
              variant="light"
              label="Edit"
              style={styles.editButton}
              textStyle={styles.editText}
            />
          </View>

          {chat ? (
            <>
              <View style={styles.identity}>
                <LinearGradient
                  colors={TILE_PALETTE[0]}
                  style={styles.bigAvatar}
                >
                  <Text style={styles.bigAvatarText}>{chat.initials}</Text>
                </LinearGradient>
                <Text style={styles.name}>{chat.name}</Text>
                <Text style={styles.status}>{chat.subtitle}</Text>
              </View>

              <View style={styles.actions}>
                <Action
                  icon={
                    chat.muted
                      ? "notifications-off-outline"
                      : "notifications-outline"
                  }
                  label={chat.muted ? "Unmute" : "Mute"}
                  onPress={() => {
                    void handleMute();
                  }}
                  width={actionWidth}
                />
                <Action
                  icon="search-outline"
                  label="Search"
                  onPress={() =>
                    Alert.alert("Search", "In-chat search is coming next.")
                  }
                  width={actionWidth}
                />
                <Action
                  icon={chat.isGroup ? "exit-outline" : "trash-outline"}
                  label={chat.isGroup ? "Leave" : "Delete"}
                  danger
                  onPress={handleDeleteOrLeave}
                  width={actionWidth}
                />
              </View>

              {latestConfirmedMeetup ? (
                <View style={styles.meetupSummary}>
                  <Text style={styles.meetupSummaryLabel}>Planned Meetup</Text>
                  <Text style={styles.meetupSummaryTitle}>
                    {latestConfirmedMeetup.title}
                  </Text>
                  <Text style={styles.meetupSummaryText}>
                    {latestConfirmedMeetup.winning_label ?? "Winning slot confirmed"}
                  </Text>
                </View>
              ) : null}

              {kind === "group" ? (
                <View style={styles.membersSection}>
                  <Text style={styles.membersLabel}>
                    MEMBERS · {reviewableMembers.length}
                  </Text>
                  <GlassSurface
                    tint="light"
                    radius={20}
                    intensity={35}
                    style={styles.membersCard}
                  >
                    <View style={styles.membersCardInner}>
                      {isLoadingGroupMembers ? (
                        <Text style={styles.membersEmptyText}>Loading members…</Text>
                      ) : groupMembersError ? (
                        <View style={styles.membersErrorState}>
                          <Text style={styles.membersEmptyText}>
                            Could not load members right now.
                          </Text>
                          <Text style={styles.membersErrorDetail}>
                            {groupMembersError}
                          </Text>
                          <GlassButton
                            label="Retry"
                            onPress={() => {
                              void loadGroupMembers();
                            }}
                            radius={14}
                            style={styles.membersRetryButton}
                            variant="light"
                          />
                        </View>
                      ) : reviewableMembers.length > 0 ? (
                        reviewableMembers.map((member, index) => (
                          <MemberReviewRow
                            key={member.id}
                            groupId={id}
                            isLast={index === reviewableMembers.length - 1}
                            member={member}
                            onRate={(reviewee) =>
                              setComposerTarget({
                                group_id: id,
                                group_name: chat.name,
                                reviewee,
                              })
                            }
                            refreshToken={reviewRefreshToken}
                          />
                        ))
                      ) : (
                        <Text style={styles.membersEmptyText}>
                          No other active members to review yet.
                        </Text>
                      )}
                    </View>
                  </GlassSurface>
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                {tabs.map((tab) => (
                  <MediaTabButton
                    key={tab}
                    label={tab}
                    active={tab === activeTab}
                    onPress={() => setActiveTab(tab)}
                  />
                ))}
              </ScrollView>

              {gridMode ? (
                <View style={styles.grid}>
                  {activeMediaItems.length > 0 ? (
                    activeMediaItems.map((item, index) => (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.tile,
                          { height: tileSize, width: tileSize },
                        ]}
                        onPress={() => {
                          if (item.url) {
                            void Linking.openURL(item.url);
                          }
                        }}
                      >
                        {item.kind === "image" && item.url ? (
                          <Image
                            source={{ uri: item.url }}
                            style={styles.tileImage}
                          />
                        ) : (
                          <LinearGradient
                            colors={TILE_PALETTE[index % TILE_PALETTE.length]}
                            style={styles.tileFallback}
                          >
                            <Ionicons
                              name={
                                item.kind === "poll" ? "stats-chart" : "play"
                              }
                              size={item.kind === "poll" ? 25 : 15}
                              color="rgba(255,255,255,0.92)"
                            />
                          </LinearGradient>
                        )}
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.mediaEmpty}>
                      <Text style={styles.mediaEmptyText}>
                        No {activeTab.toLowerCase()} yet
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.listWrap}>
                  {activeMediaItems.length > 0 ? (
                    activeMediaItems.map((item, index) => (
                      <Pressable
                        key={item.id}
                        style={styles.listRow}
                        onPress={() => {
                          if (item.url) {
                            void Linking.openURL(item.url);
                          }
                        }}
                      >
                        <LinearGradient
                          colors={TILE_PALETTE[index % TILE_PALETTE.length]}
                          style={styles.listIcon}
                        >
                          <Text style={styles.listExt}>
                            {activeTab.slice(0, 3).toUpperCase()}
                          </Text>
                        </LinearGradient>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={styles.listName}>
                            {item.title}
                          </Text>
                          <Text numberOfLines={1} style={styles.listMeta}>
                            {item.subtitle ?? "Shared in this chat"}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.mediaEmptyList}>
                      <Text style={styles.mediaEmptyText}>
                        No {activeTab.toLowerCase()} yet
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.name}>Chat not found</Text>
              <Text style={styles.status}>
                Go back and open this chat again.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      <ReviewComposerSheet
        visible={composerTarget !== null}
        target={composerTarget}
        onClose={() => setComposerTarget(null)}
        onSubmitted={handleReviewSubmitted}
      />
      <LeaveGroupReviewPrompt
        visible={leavePromptVisible}
        group={chat && kind === "group" ? { id: chat.id, name: chat.name } : null}
        members={leavePromptMembers}
        onCancel={() => setLeavePromptVisible(false)}
        onLeave={() => {
          if (!currentUserId || !chat) {
            return;
          }

          setLeavePromptVisible(false);
          void deleteGroupChats([chat.id], currentUserId).then(() =>
            router.replace("/(tabs)/chats"),
          );
        }}
        onRate={(reviewee) =>
          chat && kind === "group"
            ? setComposerTarget({
                group_id: chat.id,
                group_name: chat.name,
                reviewee,
              })
            : undefined
        }
        refreshToken={reviewRefreshToken}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "transparent", flex: 1 },
  backdropTint: {
    backgroundColor: "rgba(225,230,250,0.25)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  content: { flex: 1 },
  scroll: { paddingBottom: 40 },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  iconButton: { height: 44, width: 44 },
  editButton: { borderRadius: 21, height: 42, width: 76 },
  editText: { color: "#33333F", fontSize: 16, fontWeight: "600" },
  identity: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  bigAvatar: {
    alignItems: "center",
    borderRadius: 58,
    height: 116,
    justifyContent: "center",
    shadowColor: "#427AA0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    width: 116,
  },
  bigAvatarText: { color: "#FFFFFF", fontSize: 38, fontWeight: "700" },
  name: { color: "#1A1A26", fontSize: 30, fontWeight: "700", marginTop: 16 },
  status: { color: "#7A7A8C", fontSize: 16, fontWeight: "500", marginTop: 4 },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  meetupSummary: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  meetupSummaryLabel: {
    color: "#A4390F",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  meetupSummaryTitle: {
    color: "#1A1A26",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
  },
  meetupSummaryText: {
    color: "#6F7387",
    fontSize: 13,
    marginTop: 4,
  },
  membersSection: {
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 24,
  },
  membersLabel: {
    color: "#7A7A8C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  membersCard: {
    width: "100%",
  },
  membersCardInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  membersErrorState: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  membersEmptyText: {
    color: "#7A7A8C",
    fontSize: 13,
    paddingVertical: 4,
  },
  membersErrorDetail: {
    color: "#8A8FA6",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  membersRetryButton: {
    marginTop: 10,
    minWidth: 88,
  },
  action: {
    borderRadius: 20,
    elevation: 0,
    height: 76,
    shadowColor: "#202033",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  actionContent: { alignItems: "center", gap: 7 },
  actionLabel: { fontSize: 14, fontWeight: "600" },
  tabs: { gap: 8, paddingBottom: 16, paddingHorizontal: 24, paddingTop: 20 },
  mediaTab: {
    alignItems: "center",
    borderRadius: 19,
    height: 34,
    justifyContent: "center",
    minWidth: 68,
    paddingHorizontal: 8,
  },
  mediaTabActive: {
    backgroundColor: "#242530",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
  },
  mediaTabInactive: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
  },
  mediaTabText: {
    color: "#44495E",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  mediaTabTextActive: {
    color: "#FFFFFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 120,
    paddingHorizontal: 24,
  },
  tile: {
    borderRadius: 14,
    overflow: "hidden",
  },
  tileImage: { height: "100%", width: "100%" },
  tileFallback: {
    alignItems: "center",
    borderRadius: 14,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  tilePlay: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  mediaEmpty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    width: "100%",
  },
  mediaEmptyList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  mediaEmptyText: { color: "#7A7A8C", fontSize: 13, fontWeight: "600" },
  listWrap: { paddingHorizontal: 24 },
  listRow: {
    alignItems: "center",
    borderBottomColor: "rgba(90,110,180,0.12)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 13,
    paddingVertical: 11,
  },
  listIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  listExt: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  listName: { color: "#1A1A26", fontSize: 14, fontWeight: "600" },
  listMeta: { color: "#7A7A8C", fontSize: 12 },
  emptyState: { alignItems: "center", padding: 24 },
});
