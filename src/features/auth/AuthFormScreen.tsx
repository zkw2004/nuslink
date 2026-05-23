import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { isSupabaseConfigured, supabase } from "@lib/supabase";

type AuthMode = "sign-in" | "sign-up";

type AuthFormScreenProps = {
  mode: AuthMode;
};

const copy = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in with your NUSLink email and password.",
    action: "Log in",
    switchPrompt: "New to NUSLink?",
    switchAction: "Create an account",
    switchHref: "/(auth)/sign-up",
  },
  "sign-up": {
    title: "Create account",
    subtitle: "Use an email and password to start building your NUSLink profile.",
    action: "Sign up",
    switchPrompt: "Already have an account?",
    switchAction: "Log in",
    switchHref: "/(auth)/sign-in",
  },
} as const;

function getPasswordError(password: string) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

function getEmailError(email: string) {
  if (!email) {
    return "Email is required.";
  }

  if (!email.includes("@")) {
    return "Enter a valid email address.";
  }

  return null;
}

export function AuthFormScreen({ mode }: AuthFormScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const screenCopy = copy[mode];

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const emailError = getEmailError(trimmedEmail);
    const passwordError = getPasswordError(password);

    setError(emailError ?? passwordError);
    setSuccessMessage(null);

    if (emailError || passwordError) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: trimmedEmail,
              password,
            });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (mode === "sign-up" && !data.session) {
        setSuccessMessage("Account created. Check your email to confirm your account before logging in.");
        return;
      }

      router.replace(mode === "sign-in" ? "/(tabs)/discover" : "/(onboarding)/academic-info");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View className="flex-1 justify-center px-6 py-10">
          <View>
            <Text className="text-4xl font-bold text-gray-950">{screenCopy.title}</Text>
            <Text className="mt-3 text-base leading-6 text-gray-600">{screenCopy.subtitle}</Text>
          </View>

          <View className="mt-10">
            <Text className="mb-2 text-sm font-semibold text-gray-800">Email</Text>
            <TextInput
              className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isLoading}
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@u.nus.edu"
              placeholderTextColor="#9CA3AF"
              textContentType="emailAddress"
              value={email}
            />

            <Text className="mb-2 mt-5 text-sm font-semibold text-gray-800">Password</Text>
            <TextInput
              className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950"
              autoCapitalize="none"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              editable={!isLoading}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              textContentType={mode === "sign-in" ? "password" : "newPassword"}
              value={password}
            />

            {error ? (
              <Text className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
                {error}
              </Text>
            ) : null}

            {successMessage ? (
              <Text className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm leading-5 text-green-700">
                {successMessage}
              </Text>
            ) : null}

            <Pressable
              className={`mt-6 h-14 items-center justify-center rounded-xl bg-primary ${
                isLoading ? "opacity-80" : "opacity-100"
              }`}
              disabled={isLoading}
              onPress={handleSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">{screenCopy.action}</Text>
              )}
            </Pressable>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-600">{screenCopy.switchPrompt} </Text>
              <Link href={screenCopy.switchHref}>
                <Text className="text-sm font-bold text-primary">{screenCopy.switchAction}</Text>
              </Link>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
