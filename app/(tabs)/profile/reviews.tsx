import { router, useLocalSearchParams } from "expo-router";

import { ProfileReviewsScreen } from "@features/profile/ProfileReviewsScreen";
import { useAuthStore } from "@store/index";

export default function ProfileReviewsRoute() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const profile = useAuthStore((state) => state.profile);
  const resolvedProfileId = profileId ?? profile?.id;

  if (!resolvedProfileId) {
    return null;
  }

  return (
    <ProfileReviewsScreen
      isSelf={resolvedProfileId === profile?.id}
      onBack={() => router.back()}
      profileId={resolvedProfileId}
    />
  );
}
