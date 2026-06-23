import { useEffect, useMemo } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { File as ExpoFile } from "expo-file-system";
import { SymbolView } from "expo-symbols";

import { AppButton, AppChip, SectionCard } from "@components/shared";
import { useAuthStore, useGroupsStore, useSharedResourcesStore } from "@store/index";

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    copyToCacheDirectory: boolean;
    multiple: boolean;
    type: string[];
  }) => Promise<
    | { canceled: true }
    | {
        canceled: false;
        assets: {
          uri: string;
          name: string;
          mimeType?: string;
          size?: number;
        }[];
      }
  >;
};

function formatResourceTime(value: string) {
  const date = new Date(value);

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeTypeFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export default function GroupResourcesScreen() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";
  const session = useAuthStore((state) => state.session);
  const groups = useGroupsStore((state) => state.groups);
  const group = useMemo(
    () => groups.find((item) => item.id === groupId) ?? null,
    [groupId, groups],
  );
  const groupResourcesById = useSharedResourcesStore((state) => state.groupResources);
  const isLoading = useSharedResourcesStore((state) => state.isLoading);
  const isUploading = useSharedResourcesStore((state) => state.isUploading);
  const error = useSharedResourcesStore((state) => state.error);
  const loadGroupResources = useSharedResourcesStore((state) => state.loadGroupResources);
  const uploadGroupResource = useSharedResourcesStore((state) => state.uploadGroupResource);
  const resources = useMemo(
    () => groupResourcesById[groupId] ?? [],
    [groupId, groupResourcesById],
  );

  useEffect(() => {
    if (!session?.user.id || !groupId) {
      return;
    }

    void loadGroupResources(groupId);
  }, [groupId, loadGroupResources, session?.user.id]);

  async function handleUploadResource() {
    if (!session?.user.id) {
      Alert.alert("Sign in required", "Please sign in again before uploading files.");
      return;
    }

    let documentPicker: DocumentPickerModule;

    try {
      // eslint-disable-next-line import/no-unresolved
      documentPicker = (await import("expo-document-picker")) as DocumentPickerModule;
    } catch {
      Alert.alert(
        "File picker unavailable",
        "Install project dependencies again on this machine before uploading files.",
      );
      return;
    }

    const result = await documentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const bytes = await new ExpoFile(asset.uri).arrayBuffer();

    try {
      await uploadGroupResource(groupId, {
        bytes,
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? getMimeTypeFromName(asset.name),
        size: asset.size ?? bytes.byteLength,
      });
    } catch (uploadError) {
      Alert.alert(
        "Could not upload resource",
        uploadError instanceof Error ? uploadError.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EEF3F9" }}>
      <View className="px-5 pb-4 pt-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.replace("/(tabs)/discover")}
            className="rounded-full bg-white px-4 py-3"
          >
            <Text className="text-[13px] font-semibold text-[#0F1115]">Back</Text>
          </Pressable>

          {group ? (
            <View className="flex-1 rounded-[20px] bg-white px-4 py-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[16px] font-bold text-[#0F1115]">
                    {group.name}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#5C6370]">
                    Shared files for this group
                  </Text>
                </View>
                {group.module_code ? (
                  <AppChip label={group.module_code} variant="outline" />
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard className="mb-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-[#0F1115]">
                Group resources
              </Text>
              <Text className="mt-2 text-[14px] leading-6 text-[#5C6370]">
                Upload notes, briefs, and working files for this semester group.
              </Text>
            </View>
            <AppButton
              label={isUploading ? "Uploading..." : "Upload"}
              variant="secondary"
              disabled={isUploading || !group}
              onPress={() => {
                void handleUploadResource();
              }}
            />
          </View>

          {error ? (
            <Text className="mt-3 text-[13px] leading-6 text-red-700">{error}</Text>
          ) : null}

          {resources.length === 0 && !isLoading ? (
            <View className="mt-4 rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] px-4 py-4">
              <Text className="text-[14px] leading-6 text-[#5C6370]">
                No files have been shared for this group yet.
              </Text>
            </View>
          ) : null}

          {resources.length > 0 ? (
            <View className="mt-4 gap-3">
              {resources.map((resource) => (
                <Pressable
                  key={resource.id}
                  onPress={() => {
                    void Linking.openURL(resource.file_url);
                  }}
                  className="rounded-[16px] border border-[#E4E9F1] bg-[#F7F9FC] px-4 py-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-white">
                      <SymbolView
                        name={{
                          ios: "doc.fill",
                          android: "description",
                          web: "description",
                        }}
                        size={20}
                        tintColor="#0F1115"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#0F1115]">
                        {resource.name}
                      </Text>
                      <Text className="mt-1 text-[12px] text-[#7B8494]">
                        {formatFileSize(resource.size_bytes)} ·{" "}
                        {formatResourceTime(resource.created_at)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
