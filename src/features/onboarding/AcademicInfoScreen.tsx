import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { getCurrentSemester, searchNusmodsModules } from "@lib/nusmods";
import { saveAcademicProfile } from "./onboardingService";
import { toSelectedModule, type SelectedModule } from "./types";
import { OnboardingFrame } from "./OnboardingFrame";

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6];

export function AcademicInfoScreen() {
  const currentSemester = useMemo(() => getCurrentSemester(), []);
  const [faculty, setFaculty] = useState("");
  const [major, setMajor] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedModules, setSelectedModules] = useState<SelectedModule[]>([]);
  const [results, setResults] = useState<SelectedModule[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const query = moduleQuery.trim();

    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      void searchNusmodsModules(query)
        .then((modules) => {
          if (!isActive) {
            return;
          }

          const selectedCodes = new Set(selectedModules.map((module) => module.moduleCode));
          setResults(
            modules
              .map(toSelectedModule)
              .filter((module) => !selectedCodes.has(module.moduleCode)),
          );
        })
        .catch(() => {
          if (isActive) {
            setError("Unable to search NUSMods right now.");
          }
        })
        .finally(() => {
          if (isActive) {
            setIsSearching(false);
          }
        });
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [moduleQuery, selectedModules]);

  function addModule(module: SelectedModule) {
    setSelectedModules((currentModules) => [...currentModules, module]);
    setModuleQuery("");
    setResults([]);
    setError(null);
  }

  function removeModule(moduleCode: string) {
    setSelectedModules((currentModules) =>
      currentModules.filter((module) => module.moduleCode !== moduleCode),
    );
  }

  async function handleContinue() {
    const trimmedFaculty = faculty.trim();
    const trimmedMajor = major.trim();

    if (!trimmedFaculty || !trimmedMajor) {
      setError("Faculty and major are required.");
      return;
    }

    if (selectedModules.length === 0) {
      setError("Add at least one current-semester module.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveAcademicProfile({
        faculty: trimmedFaculty,
        major: trimmedMajor,
        yearOfStudy,
        selectedModules,
        semester: currentSemester.semester,
      });
      router.push("/(onboarding)/profile-setup");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save academics.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame
      step={2}
      title="Your academics"
      subtitle="Add your current NUS academic details and modules for this semester."
      footer={
        <Pressable
          accessibilityRole="button"
          className={`items-center rounded-2xl py-4 ${isSaving ? "bg-gray-300" : "bg-primary"}`}
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
      <View className="rounded-2xl bg-[#EEF5FC] p-4">
        <Text className="text-[13px] font-semibold text-accent">
          Email account
        </Text>
        <Text className="mt-1 text-[12px] leading-5 text-gray-600">
          NUS SSO verification comes later. For M1, email users enter academic details manually.
        </Text>
      </View>

      <View className="mt-6 gap-4">
        <View>
          <Text className="mb-2 text-[13px] font-semibold text-gray-700">Faculty</Text>
          <TextInput
            className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
            onChangeText={setFaculty}
            placeholder="School of Computing"
            placeholderTextColor="#9CA3AF"
            value={faculty}
          />
        </View>

        <View>
          <Text className="mb-2 text-[13px] font-semibold text-gray-700">Major</Text>
          <TextInput
            className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
            onChangeText={setMajor}
            placeholder="Computer Science"
            placeholderTextColor="#9CA3AF"
            value={major}
          />
        </View>

        <View>
          <Text className="mb-2 text-[13px] font-semibold text-gray-700">
            Year of study
          </Text>
          <View className="flex-row gap-1 rounded-2xl bg-gray-100 p-1">
            {YEAR_OPTIONS.map((year) => {
              const isSelected = year === yearOfStudy;
              return (
                <Pressable
                  key={year}
                  accessibilityRole="button"
                  className={`h-10 flex-1 items-center justify-center rounded-xl ${
                    isSelected ? "bg-white" : "bg-transparent"
                  }`}
                  onPress={() => setYearOfStudy(year)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    Y{year}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-7">
        <View className="mb-2 flex-row items-baseline justify-between">
          <Text className="text-[13px] font-semibold text-gray-700">
            This semester's modules
          </Text>
          <Text className="text-[11px] text-gray-400">{currentSemester.semester} · NUSMods</Text>
        </View>

        <TextInput
          autoCapitalize="characters"
          className="h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
          onChangeText={setModuleQuery}
          placeholder="Search e.g. CS2040S"
          placeholderTextColor="#9CA3AF"
          value={moduleQuery}
        />

        {isSearching ? (
          <View className="mt-3 items-start">
            <ActivityIndicator color="#D4471C" />
          </View>
        ) : null}

        {results.length > 0 ? (
          <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200">
            {results.map((module) => (
              <Pressable
                key={module.moduleCode}
                className="border-b border-gray-100 bg-white px-4 py-3"
                onPress={() => addModule(module)}
              >
                <Text className="text-sm font-bold text-gray-900">{module.moduleCode}</Text>
                <Text className="mt-1 text-xs leading-4 text-gray-500">{module.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="mt-3 flex-row flex-wrap gap-2">
          {selectedModules.map((module) => (
            <Pressable
              key={module.moduleCode}
              className="rounded-full bg-[#E1EAF5] px-3 py-2"
              onPress={() => removeModule(module.moduleCode)}
            >
              <Text className="text-[13px] font-semibold text-[#5B7BA3]">
                {module.moduleCode} ×
              </Text>
            </Pressable>
          ))}
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
