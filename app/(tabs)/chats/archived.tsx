import { useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppAvatar, GlassButton, GlassSurface } from "@components/shared";
import {
  useAuthStore,
  useCommunityMessagesStore,
  useDirectMessagesStore,
  useGroupMessagesStore,
} from "@store/index";
import { buildUnifiedInboxItems } from "@utils/chatInbox";

const APP_GRADIENT = ["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"] as const;

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

export default function ArchivedChatsScreen() {
  const session = useAuthStore((state) => state.session);
  const archivedConversations = useDirectMessagesStore((state) => state.archivedConversations);
  const unarchiveConversations = useDirectMessagesStore(
    (state) => state.unarchiveConversations,
  );
  const refreshArchivedInbox = useDirectMessagesStore(
    (state) => state.refreshArchivedInbox,
  );
  const archivedGroupChats = useGroupMessagesStore((state) => state.archivedGroupChats);
  const refreshArchivedGroupChats = useGroupMessagesStore(
    (state) => state.refreshArchivedGroupChats,
  );
  const unarchiveGroupChats = useGroupMessagesStore(
    (state) => state.unarchiveGroupChats,
  );
  const archivedCommunityChats = useCommunityMessagesStore(
    (state) => state.archivedCommunityChats,
  );
  const refreshArchivedCommunityChats = useCommunityMessagesStore(
    (state) => state.refreshArchivedCommunityChats,
  );
  const unarchiveCommunityChats = useCommunityMessagesStore(
    (state) => state.unarchiveCommunityChats,
  );

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    void Promise.all([
      refreshArchivedInbox(session.user.id),
      refreshArchivedGroupChats(session.user.id),
      refreshArchivedCommunityChats(session.user.id),
    ]);
  }, [
    refreshArchivedCommunityChats,
    refreshArchivedGroupChats,
    refreshArchivedInbox,
    session?.user.id,
  ]);

  const archivedItems = useMemo(
    () =>
      buildUnifiedInboxItems({
        conversations: archivedConversations,
        groupChats: archivedGroupChats,
        communityChats: archivedCommunityChats,
      }),
    [archivedCommunityChats, archivedConversations, archivedGroupChats],
  );

  async function handleUnarchive(kind: "direct" | "group" | "community", id: string) {
    if (!session?.user.id) {
      return;
    }

    if (kind === "direct") {
      await unarchiveConversations([id], session.user.id);
      return;
    }

    if (kind === "group") {
      await unarchiveGroupChats([id], session.user.id);
      return;
    }

    await unarchiveCommunityChats([id], session.user.id);
  }

  function handleOpen(kind: "direct" | "group" | "community", id: string) {
    if (kind === "direct") {
      router.push(`/chats/${id}` as never);
      return;
    }

    if (kind === "group") {
      router.push(`/chats/group/${id}` as never);
      return;
    }

    router.push(`/chats/community/${id}` as never);
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
          <GlassButton
            variant="light"
            style={styles.backButton}
            onPress={() => {
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#33333F" />
          </GlassButton>
          <Text style={styles.headerTitle}>Archived Chats</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <GlassSurface tint="light" radius={24} intensity={35}>
            <View style={styles.list}>
              {archivedItems.map((item, index) => (
                <View
                  key={`${item.kind}:${item.id}`}
                  style={[styles.row, index !== archivedItems.length - 1 ? styles.rowDivider : null]}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => {
                      handleOpen(item.kind, item.id);
                    }}
                  >
                    <AppAvatar
                      name={item.title}
                      imageUri={item.avatarUri ?? null}
                      size={48}
                      rounded={item.roundedAvatar ?? true}
                    />
                    <View style={styles.rowContent}>
                      <View style={styles.rowTop}>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {item.title}
                        </Text>
                        <View style={styles.rowSpacer} />
                        <Text style={styles.rowTime}>{formatInboxTime(item.timestamp)}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.rowPreview}>
                        {item.preview}
                      </Text>
                    </View>
                  </Pressable>
                  <GlassButton
                    variant="light"
                    label="Unarchive"
                    onPress={() => {
                      void handleUnarchive(item.kind, item.id);
                    }}
                    style={styles.unarchiveButton}
                    textStyle={styles.unarchiveButtonText}
                  />
                </View>
              ))}

              {archivedItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No archived chats</Text>
                  <Text style={styles.emptyText}>
                    Chats you archive from the main inbox will appear here.
                  </Text>
                </View>
              ) : null}
            </View>
          </GlassSurface>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7EBF7" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    color: "#1A1A26",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  list: {
    paddingHorizontal: 16,
  },
  row: {
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomColor: "rgba(90,110,180,0.12)",
    borderBottomWidth: 1,
  },
  rowMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  rowContent: {
    flex: 1,
    gap: 4,
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
  rowSpacer: {
    flex: 1,
  },
  rowTime: {
    color: "#8A8A9C",
    fontSize: 12.5,
  },
  rowPreview: {
    color: "#6E6E80",
    fontSize: 13,
    lineHeight: 18,
  },
  unarchiveButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  unarchiveButtonText: {
    color: "#33333F",
    fontSize: 12.5,
  },
  emptyState: {
    padding: 18,
  },
  emptyTitle: {
    color: "#1A1A26",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: "#6E6E80",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
