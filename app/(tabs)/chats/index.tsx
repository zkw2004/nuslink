import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

import { AppAvatar, GlassButton, GlassSurface } from "@components/shared";
import type { GroupChatSummary } from "@appTypes/index";
import {
  useAuthStore,
  useCommunityMessagesStore,
  useDirectMessagesStore,
  useGroupMessagesStore,
} from "@store/index";
import { buildUnifiedInboxItems, type InboxItem } from "@utils/chatInbox";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;
const AVATAR_GRADIENTS = [
  ["#E690B7", "#C96E9A"],
  ["#8D95D9", "#5E6BB5"],
  ["#F8C949", "#EAA31F"],
  ["#7DB2D3", "#427AA0"],
  ["#B17AD7", "#8457B7"],
  ["#62B3F1", "#3E88D4"],
  ["#FA7D5E", "#DF513F"],
] as const;

type SelectableKey = `${InboxItem["kind"]}:${string}`;

type ComposeOption =
  | {
      id: string;
      kind: "direct";
      title: string;
      subtitle: string;
      avatarUri: string | null;
      roundedAvatar: boolean;
      hasExistingChat: boolean;
      targetUserId: string;
    }
  | {
      id: string;
      kind: "group";
      title: string;
      subtitle: string;
      avatarUri: null;
      roundedAvatar: boolean;
      hasExistingChat: true;
      groupId: string;
      isArchived: boolean;
    };

function formatInboxTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-SG", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}

function getSelectableKey(item: InboxItem): SelectableKey {
  return `${item.kind}:${item.id}`;
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAvatarGradient(id: string) {
  let hash = 0;

  for (const char of id) {
    hash += char.charCodeAt(0);
  }

  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function InboxRow({
  item,
  editing,
  selected,
  onPress,
  onMute,
  onArchive,
  onDelete,
  isLast,
}: {
  item: InboxItem;
  editing: boolean;
  selected: boolean;
  onPress: () => void;
  onMute: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const isMuted = Boolean(item.isMuted);
  const row = (
    <Pressable
      onPress={onPress}
      style={[styles.row, !isLast ? styles.rowDivider : null]}
    >
      {editing ? (
        <View style={[styles.selectionCircle, selected ? styles.selectionCircleOn : null]}>
          {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
        </View>
      ) : null}
      <LinearGradient colors={getAvatarGradient(item.id)} style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{getInitials(item.title) || "?"}</Text>
      </LinearGradient>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.title}
          </Text>
          {isMuted ? (
            <Ionicons name="volume-mute" size={13} color="#8A8A9C" />
          ) : null}
          <View style={styles.rowTopSpacer} />
          <Text style={styles.rowTime}>{formatInboxTime(item.timestamp)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text numberOfLines={2} style={styles.rowPreview}>
            {item.preview}
          </Text>
          {item.unreadCount > 0 ? (
            <View style={styles.rowBadge}>
              <Text style={styles.rowBadgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  if (editing) {
    return row;
  }

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <Pressable style={[styles.swipeAction, styles.swipeMute]} onPress={onMute}>
            <Ionicons
              name={isMuted ? "notifications-outline" : "notifications-off-outline"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.swipeActionText}>{isMuted ? "Unmute" : "Mute"}</Text>
          </Pressable>
          <Pressable style={[styles.swipeAction, styles.swipeDelete]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </Pressable>
          <Pressable style={[styles.swipeAction, styles.swipeArchive]} onPress={onArchive}>
            <Ionicons name="archive-outline" size={18} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Archive</Text>
          </Pressable>
        </View>
      )}
    >
      {row}
    </Swipeable>
  );
}

function NewChatSheet({
  visible,
  options,
  searchQuery,
  onChangeSearch,
  onClose,
  onSelectOption,
}: {
  visible: boolean;
  options: ComposeOption[];
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onSelectOption: (option: ComposeOption) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable onPress={onClose} style={styles.sheetBackdrop}>
          <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.sheetCloseWrap}>
          <GlassButton variant="dark" style={styles.sheetCloseButton} onPress={onClose}>
            <Ionicons name="close" size={17} color="#FFFFFF" />
          </GlassButton>
        </View>

        <View style={styles.sheet}>
          <LinearGradient
            colors={["rgba(255,255,255,0.9)", "rgba(240,243,252,0.8)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheetGrabber} />
          <Text style={styles.sheetTitle}>New message</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#8A8A9C" />
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearch}
              placeholder="Search connected people or groups"
              placeholderTextColor="#8A8A9C"
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetListContent}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => (
              <View key={`${option.kind}:${option.id}`} style={styles.sheetRow}>
                <AppAvatar
                  name={option.title}
                  imageUri={option.avatarUri}
                  size={48}
                  rounded={option.roundedAvatar}
                />
                <View style={styles.sheetRowContent}>
                  <Text style={styles.sheetRowTitle}>{option.title}</Text>
                  <Text style={styles.sheetRowSubtitle}>{option.subtitle}</Text>
                </View>
                <GlassButton
                  variant={option.hasExistingChat ? "light" : "dark"}
                  label={option.hasExistingChat ? "Existing chat" : "Message"}
                  onPress={() => onSelectOption(option)}
                  style={styles.sheetActionButton}
                  textStyle={{
                    color: option.hasExistingChat ? "#33333F" : "#FFFFFF",
                    fontSize: 12.5,
                  }}
                />
              </View>
            ))}

            {options.length === 0 ? (
              <View style={styles.sheetEmptyState}>
                <Text style={styles.emptyText}>
                  No connected person or joined group matches that search yet.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatsScreen() {
  const session = useAuthStore((state) => state.session);
  const conversations = useDirectMessagesStore((state) => state.conversations);
  const archivedConversations = useDirectMessagesStore((state) => state.archivedConversations);
  const connectedProfiles = useDirectMessagesStore((state) => state.connectedProfiles);
  const refreshInbox = useDirectMessagesStore((state) => state.refreshInbox);
  const openConversationWithUser = useDirectMessagesStore(
    (state) => state.openConversationWithUser,
  );
  const markConversationsRead = useDirectMessagesStore(
    (state) => state.markConversationsRead,
  );
  const archiveConversations = useDirectMessagesStore(
    (state) => state.archiveConversations,
  );
  const unarchiveConversations = useDirectMessagesStore(
    (state) => state.unarchiveConversations,
  );
  const deleteConversations = useDirectMessagesStore(
    (state) => state.deleteConversations,
  );
  const muteConversations = useDirectMessagesStore((state) => state.muteConversations);
  const error = useDirectMessagesStore((state) => state.error);

  const groupChats = useGroupMessagesStore((state) => state.groupChats);
  const archivedGroupChats = useGroupMessagesStore((state) => state.archivedGroupChats);
  const refreshGroupChats = useGroupMessagesStore((state) => state.refreshGroupChats);
  const markGroupChatsRead = useGroupMessagesStore((state) => state.markGroupChatsRead);
  const archiveGroupChats = useGroupMessagesStore((state) => state.archiveGroupChats);
  const restoreGroupChat = useGroupMessagesStore((state) => state.restoreGroupChat);
  const deleteGroupChats = useGroupMessagesStore((state) => state.deleteGroupChats);
  const muteGroupChats = useGroupMessagesStore((state) => state.muteGroupChats);
  const groupError = useGroupMessagesStore((state) => state.error);

  const communityChats = useCommunityMessagesStore((state) => state.communityChats);
  const archivedCommunityChats = useCommunityMessagesStore(
    (state) => state.archivedCommunityChats,
  );
  const refreshCommunityChats = useCommunityMessagesStore(
    (state) => state.refreshCommunityChats,
  );
  const markCommunityChatsRead = useCommunityMessagesStore(
    (state) => state.markCommunityChatsRead,
  );
  const archiveCommunityChats = useCommunityMessagesStore(
    (state) => state.archiveCommunityChats,
  );
  const deleteCommunityChats = useCommunityMessagesStore(
    (state) => state.deleteCommunityChats,
  );
  const muteCommunityChats = useCommunityMessagesStore(
    (state) => state.muteCommunityChats,
  );
  const communityError = useCommunityMessagesStore((state) => state.error);

  const [editing, setEditing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Record<SelectableKey, boolean>>({});
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [composeSearchQuery, setComposeSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void Promise.all([
      refreshInbox(session.user.id),
      refreshGroupChats(session.user.id),
      refreshCommunityChats(session.user.id),
    ]);
  }, [
    refreshCommunityChats,
    refreshGroupChats,
    refreshInbox,
    session?.user.id,
  ]);

  const activeInboxItems = useMemo(
    () =>
      buildUnifiedInboxItems({
        conversations,
        groupChats,
        communityChats,
      }),
    [communityChats, conversations, groupChats],
  );

  const archivedInboxItems = useMemo(
    () =>
      buildUnifiedInboxItems({
        conversations: archivedConversations,
        groupChats: archivedGroupChats,
        communityChats: archivedCommunityChats,
      }),
    [archivedCommunityChats, archivedConversations, archivedGroupChats],
  );

  const normalizedChatSearch = chatSearchQuery.trim().toLowerCase();
  const visibleInboxItems = useMemo(() => {
    if (!normalizedChatSearch) {
      return activeInboxItems;
    }

    return activeInboxItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(normalizedChatSearch) ||
        item.preview.toLowerCase().includes(normalizedChatSearch) ||
        item.subtitle.toLowerCase().includes(normalizedChatSearch)
      );
    });
  }, [activeInboxItems, normalizedChatSearch]);

  const selectedItems = useMemo(
    () => visibleInboxItems.filter((item) => selectedKeys[getSelectableKey(item)]),
    [selectedKeys, visibleInboxItems],
  );

  const selectedCount = selectedItems.length;

  const normalizedComposeSearch = composeSearchQuery.trim().toLowerCase();
  const existingConversationUserIds = useMemo(
    () =>
      new Set(
        [...conversations, ...archivedConversations].map(
          (conversation) => conversation.other_user.id,
        ),
      ),
    [archivedConversations, conversations],
  );

  const composeOptions = useMemo(() => {
    const directOptions: ComposeOption[] = connectedProfiles.map((profile) => ({
      id: profile.id,
      kind: "direct",
      title: profile.display_name,
      subtitle:
        [
          profile.major,
          profile.year_of_study ? `Year ${profile.year_of_study}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Connected person",
      avatarUri: profile.avatar_url,
      roundedAvatar: true,
      hasExistingChat: existingConversationUserIds.has(profile.id),
      targetUserId: profile.id,
    }));

    const allGroups = [...groupChats, ...archivedGroupChats];
    const dedupedGroups = new Map<string, GroupChatSummary>();

    for (const group of allGroups) {
      if (!dedupedGroups.has(group.id)) {
        dedupedGroups.set(group.id, group);
      }
    }

    const groupOptions: ComposeOption[] = Array.from(dedupedGroups.values()).map((group) => ({
      id: group.id,
      kind: "group",
      title: group.name,
      subtitle:
        [group.module_code, group.type.replaceAll("_", " ")]
          .filter(Boolean)
          .join(" · ") || "Joined group",
      avatarUri: null,
      roundedAvatar: false,
      hasExistingChat: true,
      groupId: group.id,
      isArchived: group.archived_at !== null,
    }));

    const merged = [...directOptions, ...groupOptions];

    if (!normalizedComposeSearch) {
      return merged;
    }

    return merged.filter((option) => {
      return (
        option.title.toLowerCase().includes(normalizedComposeSearch) ||
        option.subtitle.toLowerCase().includes(normalizedComposeSearch)
      );
    });
  }, [
    archivedConversations,
    archivedGroupChats,
    connectedProfiles,
    existingConversationUserIds,
    groupChats,
    normalizedComposeSearch,
  ]);

  function toggleSelection(item: InboxItem) {
    const key = getSelectableKey(item);
    setSelectedKeys((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleReadAction() {
    if (!session?.user.id) {
      return;
    }

    const targetItems = selectedCount > 0 ? selectedItems : visibleInboxItems;
    const directIds = targetItems.filter((item) => item.kind === "direct").map((item) => item.id);
    const groupIds = targetItems.filter((item) => item.kind === "group").map((item) => item.id);
    const communityIds = targetItems
      .filter((item) => item.kind === "community")
      .map((item) => item.id);

    await Promise.all([
      markConversationsRead(directIds, session.user.id),
      markGroupChatsRead(groupIds, session.user.id),
      markCommunityChatsRead(communityIds, session.user.id),
    ]);
    setSelectedKeys({});
  }

  async function handleArchiveAction() {
    if (!session?.user.id || selectedCount === 0) {
      return;
    }

    const directIds = selectedItems.filter((item) => item.kind === "direct").map((item) => item.id);
    const groupIds = selectedItems.filter((item) => item.kind === "group").map((item) => item.id);
    const communityIds = selectedItems
      .filter((item) => item.kind === "community")
      .map((item) => item.id);

    await Promise.all([
      archiveConversations(directIds, session.user.id),
      archiveGroupChats(groupIds, session.user.id),
      archiveCommunityChats(communityIds, session.user.id),
    ]);
    setSelectedKeys({});
  }

  async function handleDeleteAction() {
    if (!session?.user.id || selectedCount === 0) {
      return;
    }

    const directIds = selectedItems.filter((item) => item.kind === "direct").map((item) => item.id);
    const groupIds = selectedItems.filter((item) => item.kind === "group").map((item) => item.id);
    const communityIds = selectedItems
      .filter((item) => item.kind === "community")
      .map((item) => item.id);

    await Promise.all([
      deleteConversations(directIds, session.user.id),
      deleteGroupChats(groupIds, session.user.id),
      deleteCommunityChats(communityIds, session.user.id),
    ]);
    setSelectedKeys({});
  }

  async function handleMuteInboxItem(item: InboxItem) {
    if (!session?.user.id) {
      return;
    }

    const muted = !item.isMuted;

    if (item.kind === "direct") {
      await muteConversations([item.id], session.user.id, muted);
      return;
    }

    if (item.kind === "group") {
      await muteGroupChats([item.id], session.user.id, muted);
      return;
    }

    await muteCommunityChats([item.id], session.user.id, muted);
  }

  async function handleArchiveInboxItem(item: InboxItem) {
    if (!session?.user.id) {
      return;
    }

    if (item.kind === "direct") {
      await archiveConversations([item.id], session.user.id);
      return;
    }

    if (item.kind === "group") {
      await archiveGroupChats([item.id], session.user.id);
      return;
    }

    await archiveCommunityChats([item.id], session.user.id);
  }

  function handleDeleteInboxItem(item: InboxItem) {
    if (!session?.user.id) {
      return;
    }

    const copy =
      item.kind === "direct"
        ? "This deletes the DM for both users."
        : "This makes you leave this chat. Other members will keep it.";

    Alert.alert("Delete chat?", copy, [
      { text: "Cancel", style: "cancel" },
      {
        text: item.kind === "direct" ? "Delete for both" : "Leave",
        style: "destructive",
        onPress: () => {
          if (!session?.user.id) {
            return;
          }

          if (item.kind === "direct") {
            void deleteConversations([item.id], session.user.id);
            return;
          }

          if (item.kind === "group") {
            void deleteGroupChats([item.id], session.user.id);
            return;
          }

          void deleteCommunityChats([item.id], session.user.id);
        },
      },
    ]);
  }

  async function handleOpenInboxItem(item: InboxItem) {
    if (editing) {
      toggleSelection(item);
      return;
    }

    if (!session?.user.id) {
      return;
    }

    if (item.kind === "direct") {
      router.push(`/chats/${item.id}` as never);
      return;
    }

    if (item.kind === "group") {
      router.push(`/chats/group/${item.id}` as never);
      return;
    }

    router.push(`/chats/community/${item.id}` as never);
  }

  async function handleSelectComposeOption(option: ComposeOption) {
    if (!session?.user.id) {
      return;
    }

    if (option.kind === "direct") {
      const conversationId = await openConversationWithUser(option.targetUserId, session.user.id);
      setIsComposeOpen(false);
      setComposeSearchQuery("");
      router.push(`/chats/${conversationId}` as never);
      return;
    }

    if (option.isArchived) {
      await restoreGroupChat(option.groupId, session.user.id);
    }

    setIsComposeOpen(false);
    setComposeSearchQuery("");
    router.push(`/chats/group/${option.groupId}` as never);
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={APP_GRADIENT}
        locations={[0, 0.44, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setEditing((current) => !current);
              setSelectedKeys({});
            }}
          >
            <GlassSurface tint="light" radius={100} intensity={40} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>{editing ? "Done" : "Edit"}</Text>
            </GlassSurface>
          </Pressable>
          <Text style={styles.headerTitle}>Chats</Text>
          {editing ? (
            <View style={styles.headerRightSpacer} />
          ) : (
            <View style={styles.headerActions}>
              <GlassButton
                variant="light"
                style={styles.iconButton}
                onPress={() => {
                  router.push("/(tabs)/chats/archived" as never);
                }}
              >
                <Ionicons name="archive-outline" size={19} color="#33333F" />
              </GlassButton>
              <GlassButton
                variant="light"
                style={styles.iconButton}
                onPress={() => {
                  setComposeSearchQuery("");
                  setIsComposeOpen(true);
                }}
              >
                <Ionicons name="pencil-outline" size={19} color="#33333F" />
              </GlassButton>
            </View>
          )}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#8A8A9C" />
          <TextInput
            value={chatSearchQuery}
            onChangeText={setChatSearchQuery}
            placeholder="Search"
            placeholderTextColor="#8A8A9C"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error || groupError || communityError ? (
            <GlassSurface tint="light" radius={24} intensity={35}>
              <View style={styles.stateBlock}>
                <Text style={styles.stateTitle}>Chats are not available yet</Text>
                <Text style={styles.emptyText}>{error ?? groupError ?? communityError}</Text>
              </View>
            </GlassSurface>
          ) : null}

          <GlassSurface tint="light" radius={24} intensity={35}>
            <View style={styles.inboxList}>
              {visibleInboxItems.map((item, index) => (
                <InboxRow
                  key={getSelectableKey(item)}
                  item={item}
                  editing={editing}
                  selected={Boolean(selectedKeys[getSelectableKey(item)])}
                  onPress={() => {
                    void handleOpenInboxItem(item);
                  }}
                  onMute={() => {
                    void handleMuteInboxItem(item);
                  }}
                  onArchive={() => {
                    void handleArchiveInboxItem(item);
                  }}
                  onDelete={() => {
                    handleDeleteInboxItem(item);
                  }}
                  isLast={index === visibleInboxItems.length - 1}
                />
              ))}

              {visibleInboxItems.length === 0 ? (
                <View style={styles.stateBlock}>
                  <Text style={styles.stateTitle}>
                    {activeInboxItems.length === 0 ? "No chats yet" : "No matching chats"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {activeInboxItems.length === 0
                      ? "Join a group or connect with someone to start building your inbox."
                      : "Try a different search term for active chats."}
                  </Text>
                </View>
              ) : null}
            </View>
          </GlassSurface>

          {!editing && archivedInboxItems.length > 0 ? (
            <Pressable
              onPress={() => {
                router.push("/(tabs)/chats/archived" as never);
              }}
            >
              <GlassSurface tint="light" radius={22} intensity={35} style={styles.archivedCard}>
                <View style={styles.archivedRow}>
                  <Text style={styles.archivedLabel}>Archived chats</Text>
                  <View style={styles.archivedCount}>
                    <Text style={styles.archivedCountText}>{archivedInboxItems.length}</Text>
                  </View>
                </View>
              </GlassSurface>
            </Pressable>
          ) : null}
        </ScrollView>

        {editing ? (
          <View style={styles.actionBar}>
            <GlassButton
              variant="light"
              label={selectedCount > 0 ? "Read" : "Read All"}
              onPress={() => {
                void handleReadAction();
              }}
              style={styles.actionPill}
              textStyle={{ color: "#4238B0" }}
            />
            <GlassButton
              variant="light"
              label="Archive"
              onPress={() => {
                void handleArchiveAction();
              }}
              style={styles.actionPill}
              textStyle={{ color: selectedCount > 0 ? "#33333F" : "#9A9AA8" }}
            />
            <GlassButton
              variant="light"
              label="Delete"
              onPress={() => {
                void handleDeleteAction();
              }}
              style={styles.actionPill}
              textStyle={{ color: selectedCount > 0 ? "#D2483F" : "#D9A09B" }}
            />
          </View>
        ) : null}

        <NewChatSheet
          visible={isComposeOpen}
          options={composeOptions}
          searchQuery={composeSearchQuery}
          onChangeSearch={setComposeSearchQuery}
          onClose={() => {
            setIsComposeOpen(false);
          }}
          onSelectOption={(option) => {
            void handleSelectComposeOption(option);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  headerButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 88,
  },
  headerButtonText: {
    color: "#33333F",
    fontSize: 14,
    fontWeight: "500",
  },
  headerTitle: {
    color: "#1A1A26",
    fontSize: 17,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerRightSpacer: {
    width: 88,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 100,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 4,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  searchInput: {
    color: "#22222E",
    flex: 1,
    fontSize: 15,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 110,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  inboxList: {
    paddingHorizontal: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomColor: "rgba(90,110,180,0.12)",
    borderBottomWidth: 1,
  },
  selectionCircle: {
    alignItems: "center",
    borderColor: "rgba(120,130,170,0.5)",
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  selectionCircleOn: {
    backgroundColor: "rgba(91,79,224,0.95)",
    borderColor: "rgba(91,79,224,0.95)",
  },
  rowContent: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  rowTitle: {
    color: "#1A1A26",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowTopSpacer: {
    flex: 1,
  },
  rowTime: {
    color: "#8A8A9C",
    fontSize: 12.5,
  },
  rowBottom: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  rowPreview: {
    color: "#6E6E80",
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  rowBadge: {
    alignItems: "center",
    backgroundColor: "rgba(120,128,150,0.85)",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    minWidth: 22,
    paddingHorizontal: 7,
  },
  rowBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  rowAvatar: {
    alignItems: "center",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  rowAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  swipeActions: {
    alignItems: "stretch",
    flexDirection: "row",
    marginVertical: 8,
    overflow: "hidden",
  },
  swipeAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: 76,
  },
  swipeMute: {
    backgroundColor: "#7A849D",
  },
  swipeDelete: {
    backgroundColor: "#D2483F",
  },
  swipeArchive: {
    backgroundColor: "#5B4FE0",
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  stateBlock: {
    gap: 8,
    padding: 18,
  },
  stateTitle: {
    color: "#1A1A26",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: "#6E6E80",
    fontSize: 13,
    lineHeight: 18,
  },
  archivedCard: {
    width: "100%",
  },
  archivedRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  archivedLabel: {
    color: "#1A1A26",
    fontSize: 15,
    fontWeight: "600",
  },
  archivedCount: {
    alignItems: "center",
    backgroundColor: "rgba(18,19,30,0.9)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: 8,
  },
  archivedCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBar: {
    bottom: 96,
    elevation: 20,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  actionPill: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 112,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(40,48,90,0.28)",
  },
  sheetCloseWrap: {
    position: "absolute",
    right: 18,
    top: 52,
    zIndex: 2,
  },
  sheetCloseButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sheet: {
    borderColor: "rgba(255,255,255,0.85)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    bottom: 0,
    gap: 16,
    height: "82%",
    left: 0,
    overflow: "hidden",
    padding: 22,
    position: "absolute",
    right: 0,
    shadowColor: "#3240A0",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  sheetGrabber: {
    alignSelf: "center",
    backgroundColor: "rgba(90,110,180,0.28)",
    borderRadius: 100,
    height: 5,
    width: 40,
  },
  sheetTitle: {
    color: "#1A1A26",
    fontSize: 20,
    fontWeight: "700",
  },
  sheetListContent: {
    gap: 10,
    paddingBottom: 30,
  },
  sheetRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 12,
  },
  sheetRowContent: {
    flex: 1,
    minWidth: 0,
  },
  sheetRowTitle: {
    color: "#1A1A26",
    fontSize: 15,
    fontWeight: "600",
  },
  sheetRowSubtitle: {
    color: "#6E6E80",
    fontSize: 12.5,
    marginTop: 2,
  },
  sheetActionButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  sheetEmptyState: {
    alignItems: "center",
    paddingVertical: 20,
  },
});
