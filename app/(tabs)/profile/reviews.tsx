import { router } from "expo-router";

import { ProfileReviewsScreen } from "@features/profile/ProfileReviewsScreen";
import { useAuthStore } from "@store/index";

export default function ProfileReviewsRoute() {
  const profile = useAuthStore((state) => state.profile);

  if (!profile) {
    return null;
  }

  return (
    <ProfileReviewsScreen
      isSelf
      onBack={() => router.back()}
      profileId={profile.id}
    />
  );
}
