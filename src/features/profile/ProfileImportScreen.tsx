import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppButton, GlassSurface } from "@components/shared";
import { ProfileImportReview } from "@features/profile/ProfileImportReview";
import {
  extractProfileFromResume,
  type ProfileExtractionDraft,
} from "@services/profileExtractionService";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

type DocumentPickerAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type DocumentPickerResult =
  | { canceled: true; assets?: never }
  | { canceled: false; assets: DocumentPickerAsset[] };

type DocumentPickerModule = {
  getDocumentAsync(options: {
    copyToCacheDirectory: boolean;
    multiple: boolean;
    type: string[];
  }): Promise<DocumentPickerResult>;
};

type FileSystemModule = typeof import("expo-file-system");

function inferMimeType(asset: DocumentPickerAsset): SupportedMimeType | null {
  if (
    asset.mimeType &&
    SUPPORTED_MIME_TYPES.includes(asset.mimeType as SupportedMimeType)
  ) {
    return asset.mimeType as SupportedMimeType;
  }

  const extension = asset.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, SupportedMimeType> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };
  return extension ? byExtension[extension] ?? null : null;
}

export function ProfileImportScreen() {
  const [draft, setDraft] = useState<ProfileExtractionDraft | null>(null);
  const [filename, setFilename] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleSelectResume() {
    let documentPicker: DocumentPickerModule;
    let fileSystem: FileSystemModule;
    try {
      [documentPicker, fileSystem] = await Promise.all([
        import("expo-document-picker") as Promise<DocumentPickerModule>,
        import("expo-file-system"),
      ]);
    } catch {
      Alert.alert(
        "File picker unavailable",
        "Update or rebuild the app before importing a resume.",
      );
      return;
    }

    const result = await documentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [...SUPPORTED_MIME_TYPES],
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = inferMimeType(asset);
    if (!mimeType) {
      Alert.alert(
        "Unsupported file",
        "Choose a PDF, Word document, JPEG, or PNG resume.",
      );
      return;
    }

    if (asset.size && asset.size > MAX_FILE_BYTES) {
      Alert.alert("File too large", "Resume files must be 10 MB or smaller.");
      return;
    }

    setIsExtracting(true);
    setFilename(asset.name);
    try {
      const file = new fileSystem.File(asset.uri);
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("Resume files must be 10 MB or smaller.");
      }
      const fileBase64 = await file.base64();
      const nextDraft = await extractProfileFromResume({
        filename: asset.name,
        mimeType,
        fileBase64,
      });
      setDraft(nextDraft);
    } catch (error) {
      Alert.alert(
        "Could not extract profile",
        error instanceof Error ? error.message : "Please try another resume.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <LinearGradient
      className="flex-1"
      colors={["#F6F8FD", "#E7EBF7", "#D3DBEE", "#C6D0E8"]}
      locations={[0, 0.44, 0.8, 1]}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            className="h-10 w-10 items-center justify-center rounded-full bg-white/60"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#222A36" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[23px] font-bold tracking-[-0.5px] text-[#171923]">
              Import from resume
            </Text>
            <Text className="mt-0.5 text-[12px] text-[#687183]">
              Review every suggestion before it is saved.
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-24"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassSurface
            tint="light"
            radius={22}
            intensity={36}
            style={{ width: "100%" }}
          >
            <View className="gap-3 p-5">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#DCE7F5]">
                <Ionicons
                  name="document-text-outline"
                  size={23}
                  color="#334D73"
                />
              </View>
              <Text className="text-[17px] font-bold text-[#171923]">
                Select your resume
              </Text>
              <Text className="text-[13px] leading-5 text-[#606A7B]">
                PDF, Word, JPEG, or PNG · up to 10 MB. Contact details and
                sensitive identifiers are excluded from extraction.
              </Text>
              <AppButton
                label={
                  isExtracting
                    ? "Extracting securely..."
                    : draft
                      ? "Choose another resume"
                      : "Choose resume"
                }
                disabled={isExtracting}
                onPress={() => {
                  void handleSelectResume();
                }}
              />
              {isExtracting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#334D73" />
                  <Text className="text-[12px] text-[#606A7B]">
                    This can take up to a minute.
                  </Text>
                </View>
              ) : filename ? (
                <Text className="text-[12px] font-semibold text-[#536174]">
                  {filename}
                </Text>
              ) : null}
            </View>
          </GlassSurface>

          {draft ? (
            <ProfileImportReview
              key={filename}
              initialDraft={draft}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
