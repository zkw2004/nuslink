import { Redirect } from "expo-router";

export default function Index() {
  // TODO (Joel): Check auth state from Supabase and redirect accordingly
  // Authenticated → /(tabs)/discover
  // First login → /(onboarding)/academic-info
  // Not authenticated → /(auth)/sign-in
  return <Redirect href="/(auth)/sign-in" />;
}
