import { fetchNusmodsModuleDetail, getCurrentSemester } from "@lib/nusmods";
import { supabase } from "@lib/supabase";
import type { TimetableClassSlot, TimetableSlot } from "@appTypes/index";
import {
  NUSMODS_DAY_INDEX,
  deriveFreeBlocksFromOccupiedSlots,
  formatClassSlotLabel,
  formatDayOfWeek,
  formatMinuteOfDay,
  matchesLessonSelection,
  parseManualTimeInput,
  parseNusmodsShareUrl,
  parseTimeDigits,
  type LessonSelection,
} from "@utils/timetable";

type OccupiedClassSlot = TimetableClassSlot;

function buildOccupiedLessonSlots(
  moduleSelections: Map<string, LessonSelection[]>,
  semesterNumber: number,
) : Promise<OccupiedClassSlot[]> {
  return Promise.all(
    Array.from(moduleSelections.entries()).map(async ([moduleCode, selections]) => {
      const detail = await fetchNusmodsModuleDetail(moduleCode);
      const semesterData = detail.semesterData?.find(
        (entry) => entry.semester === semesterNumber,
      );

      if (!semesterData?.timetable?.length) {
        return [];
      }

      return semesterData.timetable
        .filter((lesson, lessonIndex) => {
          return selections.some((selection) => {
            return (
              matchesLessonSelection(
                selection,
                lesson.lessonType,
                lesson.classNo,
                lessonIndex,
              )
            );
          });
        })
        .map((lesson) => {
          const dayOfWeek = NUSMODS_DAY_INDEX[lesson.day.trim().toUpperCase()];

          if (!dayOfWeek) {
            return null;
          }

          return {
            module_code: moduleCode,
            lesson_type: lesson.lessonType,
            class_no: lesson.classNo,
            dayOfWeek,
            startMinute: parseTimeDigits(lesson.startTime),
            endMinute: parseTimeDigits(lesson.endTime),
          };
        })
        .filter(
          (
            lesson,
          ): lesson is {
            module_code: string;
            lesson_type: string;
            class_no: string;
            dayOfWeek: number;
            startMinute: number;
            endMinute: number;
          } => lesson !== null,
        )
        .map((lesson) => ({
          module_code: lesson.module_code,
          lesson_type: lesson.lesson_type,
          class_no: lesson.class_no,
          day_of_week: lesson.dayOfWeek,
          start_minute: lesson.startMinute,
          end_minute: lesson.endMinute,
        }));
    }),
  ).then((occupiedByModule) =>
    occupiedByModule
      .flat()
      .sort(
        (left, right) =>
          left.day_of_week - right.day_of_week ||
          left.start_minute - right.start_minute ||
          left.module_code.localeCompare(right.module_code),
      ),
  );
}

export async function importTimetableFromNusmodsShareUrl(rawUrl: string) {
  const fallbackSemesterNumber = Number(getCurrentSemester().semester.slice(-1));
  const resolvedUrl = await resolveNusmodsShareUrl(rawUrl);
  const { moduleSelections, semesterNumber } = parseNusmodsShareUrl(
    resolvedUrl,
    fallbackSemesterNumber,
  );
  const occupiedSlots = await buildOccupiedLessonSlots(
    moduleSelections,
    semesterNumber,
  );

  if (occupiedSlots.length === 0) {
    throw new Error(
      "No timetable lessons could be matched from that share link. Check that it includes your selected tutorial and lecture groups.",
    );
  }

  return {
    occupiedSlots,
    availabilitySlots: deriveFreeBlocksFromOccupiedSlots(occupiedSlots),
  };
}

async function resolveNusmodsShareUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl;
  }

  if (!url.hostname.includes("shorten.nusmods.com")) {
    return rawUrl;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("Unable to expand the shortened NUSMods link.");
  }

  return response.url || rawUrl;
}

export async function fetchCurrentSemesterTimetableSlots(userId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();
  const { data, error } = await supabase
    .from("timetable_slots")
    .select("*")
    .eq("user_id", userId)
    .eq("semester", semester)
    .order("day_of_week", { ascending: true })
    .order("start_minute", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function replaceCurrentSemesterTimetableSlots(
  userId: string,
  slots: TimetableSlot[],
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { semester } = getCurrentSemester();

  const { error: deleteError } = await supabase
    .from("timetable_slots")
    .delete()
    .eq("user_id", userId)
    .eq("semester", semester);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (slots.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("timetable_slots").insert(
    slots.map((slot) => ({
      user_id: userId,
      semester,
      day_of_week: slot.day_of_week,
      start_minute: slot.start_minute,
      end_minute: slot.end_minute,
      source: slot.source,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export {
  formatClassSlotLabel,
  formatDayOfWeek,
  formatMinuteOfDay,
  parseManualTimeInput,
};
