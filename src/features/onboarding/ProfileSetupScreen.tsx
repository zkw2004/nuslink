import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { AppAvatar } from "@components/shared";
import { saveProfileSetup, uploadProfileImage } from "./onboardingService";
import { OnboardingFrame } from "./OnboardingFrame";

const BIO_LIMIT = 200;

export function ProfileSetupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage() {
    setIsPicking(true);
    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Photo library permission is needed to choose a profile image.");
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
        setError("Unable to read that image. Try another photo.");
        return;
      }

      setAvatarUri(asset.uri);
      setAvatarBase64(asset.base64);
      setAvatarUrl(null);
    } catch {
      setError("Unable to choose a profile image.");
    } finally {
      setIsPicking(false);
    }
  }

  async function handleContinue() {
    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();

    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    if (trimmedBio.length > BIO_LIMIT) {
      setError(`Bio must be ${BIO_LIMIT} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let uploadedAvatarUrl = avatarUrl;

      if (avatarUri && avatarBase64 && !uploadedAvatarUrl) {
        uploadedAvatarUrl = await uploadProfileImage({
          base64: avatarBase64,
          uri: avatarUri,
        });
        setAvatarUrl(uploadedAvatarUrl);
      }

      await saveProfileSetup({
        avatarUrl: uploadedAvatarUrl,
        bio: trimmedBio,
        displayName: trimmedName,
      });

      router.push("/(onboarding)/interests");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame
      step={3}
      title="Your profile"
      subtitle="A photo and a short bio help peers know who they're matching with."
      footer={
        <Pressable
          accessibilityRole="button"
          className={`items-center rounded-2xl py-4 ${isSaving ? "bg-gray-300" : "bg-[#0F1115]"}`}
          disabled={isSaving}
          onPress={handleContinue}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">Continue →</Text>
          )}
        </Pressable>
      }
    >
      <View className="items-center">
        <View className="relative">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="h-[120px] w-[120px] rounded-[28px]"
            />
          ) : (
            <AppAvatar name={displayName || "NUSLink"} size={120} rounded={false} />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
            className="absolute -bottom-1 -right-1 h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#0F1115]"
            disabled={isPicking}
            onPress={handlePickImage}
          >
            {isPicking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SymbolView
                name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }}
                size={18}
                tintColor="#FFFFFF"
              />
            )}
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-4"
          disabled={isPicking}
          onPress={handlePickImage}
        >
          <Text className="text-sm font-semibold text-accent">Choose a photo</Text>
        </Pressable>
      </View>

      <View className="mt-8 gap-4">
        <View>
          <Text className="mb-2 text-[13px] font-semibold text-gray-700">
            Display name
          </Text>
          <TextInput
            className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
            onChangeText={setDisplayName}
            placeholder="Joel Yap"
            placeholderTextColor="#9CA3AF"
            value={displayName}
          />
        </View>

        <View>
          <View className="mb-2 flex-row items-baseline justify-between">
            <Text className="text-[13px] font-semibold text-gray-700">Bio</Text>
            <Text className="text-[11px] text-gray-400">
              {bio.length}/{BIO_LIMIT}
            </Text>
          </View>
          <TextInput
            className="min-h-[116px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-6 text-gray-900"
            maxLength={BIO_LIMIT}
            multiline
            onChangeText={setBio}
            placeholder="What you're working on, what you're looking for."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            value={bio}
          />
          <Text className="mt-2 text-[12px] leading-5 text-gray-500">
            Share what you are building, what modules you care about, or what kind of teammates you hope to find.
          </Text>
        </View>
      </View>

      {error ? (
        <Text className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          {error}
        </Text>
      ) : null}
    </OnboardingFrame>
  );
}
