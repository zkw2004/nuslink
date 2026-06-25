import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";

import { AppAvatar, AppChip, SectionCard } from "@components/shared";
import { getCommunityMediaCollections } from "@utils/chatMedia";
import {
  useAuthStore,
  useCommunityMessagesStore,
  useSharedResourcesStore,
} from "@store/index";

type Category = "images" | "files" | "links";

function formatDate(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommunityMediaScreen() {
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communityId = typeof params.communityId === "string" ? params.communityId : "";
  const session = useAuthStore((state) => state.session);
  const communityChats = useCommunityMessagesStore((state) => state.communityChats);
  const messagesByCommunity = useCommunityMessagesStore(
    (state) => state.messagesByCommunity,
  );
  const communityResourcesById = useSharedResourcesStore(
    (state) => state.communityResources,
  );
  const refreshCommunityChats = useCommunityMessagesStore(
    (state) => state.refreshCommunityChats,
  );
  const loadCommunityMessages = useCommunityMessagesStore(
    (state) => state.loadCommunityMessages,
  );
  const loadCommunityResources = useSharedResourcesStore(
    (state) => state.loadCommunityResources,
  );
  const [category, setCategory] = useState<Category>("images");

  const community = useMemo(
    () => communityChats.find((item) => item.id === communityId) ?? null,
    [communityChats, communityId],
  );
  const collections = useMemo(
    () =>
      getCommunityMediaCollections(
        messagesByCommunity[communityId] ?? [],
        communityResourcesById[communityId] ?? [],
      ),
    [communityId, communityResourcesById, messagesByCommunity],
  );

  useEffect(() => {
    if (!session?.user.id || !communityId) {
      return;
    }

    void refreshCommunityChats(session.user.id).then(() => {
      void Promise.all([
        loadCommunityMessages(communityId, session.user.id),
        loadCommunityResources(communityId),
      ]);
    });
  }, [
    communityId,
    loadCommunityMessages,
    loadCommunityResources,
    refreshCommunityChats,
    session?.user.id,
  ]);

  const activeItems =
    category === "images"
      ? collections.images
      : category === "files"
        ? collections.files
        : collections.links;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <View className="px-5 pb-4 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full bg-white px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-[#0F1115]">Back</Text>
          </Pressable>

          {community ? (
            <View className="flex-1 rounded-[20px] bg-white px-4 py-3">
              <View className="flex-row items-center gap-3">
                <AppAvatar name={community.name} size={44} rounded={false} />
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-[#0F1115]">
                    {community.name}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#5C6370]">
                    Shared media, files, and links
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <View className="flex-row flex-wrap gap-2">
            {([
              { label: `Images (${collections.images.length})`, value: "images" },
              { label: `Files (${collections.files.length})`, value: "files" },
              { label: `Links (${collections.links.length})`, value: "links" },
            ] as const).map((option) => (
              <Pressable key={option.value} onPress={() => setCategory(option.value)}>
                <AppChip
                  label={option.label}
                  variant={category === option.value ? "solid" : "outline"}
                />
              </Pressable>
            ))}
          </View>
        </SectionCard>

        {activeItems.length === 0 ? (
          <SectionCard>
            <Text className="text-[16px] font-bold text-[#0F1115]">
              Nothing here yet
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
              {category === "images"
                ? "Images shared in chat or resources will show up here."
                : category === "files"
                  ? "Files, audio, video, and shared resources will show up here."
                  : "Links sent in chat messages will show up here."}
            </Text>
          </SectionCard>
        ) : null}

        {category === "images" ? (
          <View className="gap-3">
            {collections.images.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void Linking.openURL(item.url);
                }}
              >
                <SectionCard>
                  <Image
                    source={{ uri: item.url }}
                    className="h-56 w-full rounded-[14px] bg-[#DDE5EF]"
                    resizeMode="cover"
                  />
                  <Text className="mt-3 text-[13px] text-[#5C6370]">
                    {formatDate(item.created_at)}
                  </Text>
                </SectionCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        {category === "files" ? (
          <View className="gap-3">
            {collections.files.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void Linking.openURL(item.url);
                }}
              >
                <SectionCard>
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#EEF2F7]">
                      <SymbolView
                        name={{
                          ios:
                            item.kind === "audio"
                              ? "waveform"
                              : item.kind === "video"
                                ? "play.rectangle.fill"
                                : item.kind === "resource"
                                  ? "tray.full.fill"
                                  : "doc.fill",
                          android:
                            item.kind === "audio"
                              ? "graphic_eq"
                              : item.kind === "video"
                                ? "movie"
                                : "description",
                          web:
                            item.kind === "audio"
                              ? "graphic_eq"
                              : item.kind === "video"
                                ? "movie"
                                : "description",
                        }}
                        size={20}
                        tintColor="#0F1115"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#0F1115]">
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-[12px] text-[#7B8494]">
                        {item.subtitle ?? "Attachment"} · {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                </SectionCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        {category === "links" ? (
          <View className="gap-3">
            {collections.links.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void Linking.openURL(item.url);
                }}
              >
                <SectionCard>
                  <Text className="text-[14px] font-semibold text-[#0F1115]">
                    {item.label}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#7B8494]">
                    {formatDate(item.created_at)}
                  </Text>
                </SectionCard>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
