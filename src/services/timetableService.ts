import { fetchNusmodsModuleDetail, getCurrentSemester } from "@lib/nusmods";
import { supabase } from "@lib/supabase";
import type { TimetableSlot } from "@appTypes/index";

const WEEKDAY_START_MINUTE = 8 * 60;
const WEEKDAY_END_MINUTE = 22 * 60;
const MIN_FREE_BLOCK_MINUTES = 30;

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const NUSMODS_DAY_INDEX: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

type LessonSelection = {
  classNo: string;
  lessonType: string;
};

type ImportPayload = {
  semesterNumber: number;
  moduleSelections: Map<string, LessonSelection[]>;
};

function parseTimeDigits(value: string) {
  const normalized = value.replace(":", "").trim();

  if (!/^\d{4}$/.test(normalized)) {
    throw new Error("Times must use HH:MM format.");
  }

  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2, 4));

  if (hours > 23 || minutes > 59) {
    throw new Error("Times must use a valid 24-hour clock.");
  }

  return hours * 60 + minutes;
}

function normalizeLessonToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function expandLessonTypeToken(value: string) {
  const normalizedValue = normalizeLessonToken(value);

  switch (normalizedValue) {
    case "LEC":
      return ["LEC", "LECTURE", "PACKAGEDLECTURE", "DESIGNLECTURE"];
    case "TUT":
      return ["TUT", "TUTORIAL", "PACKAGEDTUTORIAL"];
    case "LAB":
      return ["LAB", "LABORATORY"];
    case "REC":
      return ["REC", "RECITATION"];
    case "SEC":
      return ["SEC", "SECTIONALTEACHING"];
    case "SEM":
      return ["SEM", "SEMINAR", "SEMINARSTYLEMODULECLASS"];
    default:
      return [normalizedValue];
  }
}

function extractShareQueryParts(url: URL) {
  if (url.searchParams.size > 0) {
    return {
      params: new URLSearchParams(url.search),
      pathHint: `${url.pathname}${url.hash}`,
    };
  }

  const hashValue = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const queryStartIndex = hashValue.indexOf("?");

  if (queryStartIndex === -1) {
    return {
      params: new URLSearchParams(),
      pathHint: `${url.pathname}${hashValue}`,
    };
  }

  return {
    params: new URLSearchParams(hashValue.slice(queryStartIndex + 1)),
    pathHint: `${url.pathname}${hashValue.slice(0, queryStartIndex)}`,
  };
}

function parseNusmodsShareUrl(rawUrl: string): ImportPayload {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Paste a valid NUSMods share link.");
  }

  if (!url.hostname.includes("nusmods.com")) {
    throw new Error("Use a NUSMods timetable share link.");
  }

  const { params, pathHint } = extractShareQueryParts(url);
  const semesterMatch = pathHint.match(/sem-(\d)/i);
  const semesterNumber = semesterMatch ? Number(semesterMatch[1]) : Number(getCurrentSemester().semester.slice(-1));
  const moduleSelections = new Map<string, LessonSelection[]>();

  for (const [rawModuleCode, rawSelection] of params.entries()) {
    const moduleCode = rawModuleCode.trim().toUpperCase();
    if (!moduleCode || !rawSelection.trim()) {
      continue;
    }

    const selections = rawSelection
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^([^:=]+)[:=](.+)$/);

        if (!match) {
          return null;
        }

        return {
          lessonType: match[1].trim(),
          classNo: match[2].trim().toUpperCase(),
        };
      })
      .filter((selection): selection is LessonSelection => selection !== null);

    if (selections.length > 0) {
      moduleSelections.set(moduleCode, selections);
    }
  }

  if (moduleSelections.size === 0) {
    throw new Error(
      "Could not find lesson selections in that link. Open your timetable in NUSMods and use its share URL.",
    );
  }

  return {
    semesterNumber,
    moduleSelections,
  };
}

function buildOccupiedLessonSlots(
  moduleSelections: Map<string, LessonSelection[]>,
  semesterNumber: number,
) {
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
        .filter((lesson) => {
          const normalizedLessonType = normalizeLessonToken(lesson.lessonType);
          const classNo = lesson.classNo.trim().toUpperCase();

          return selections.some((selection) => {
            const allowedLessonTypes = expandLessonTypeToken(selection.lessonType);
            return (
              classNo === selection.classNo &&
              allowedLessonTypes.includes(normalizedLessonType)
            );
          });
        })
        .map((lesson) => {
          const dayOfWeek = NUSMODS_DAY_INDEX[lesson.day.trim().toUpperCase()];

          if (!dayOfWeek) {
            return null;
          }

          return {
            dayOfWeek,
            startMinute: parseTimeDigits(lesson.startTime),
            endMinute: parseTimeDigits(lesson.endTime),
          };
        })
        .filter(
          (
            lesson,
          ): lesson is {
            dayOfWeek: number;
            startMinute: number;
            endMinute: number;
          } => lesson !== null,
        );
    }),
  ).then((occupiedByModule) => occupiedByModule.flat());
}

function mergeIntervals(
  intervals: { startMinute: number; endMinute: number }[],
) {
  if (intervals.length === 0) {
    return [];
  }

  const sortedIntervals = [...intervals].sort(
    (left, right) => left.startMinute - right.startMinute,
  );
  const mergedIntervals = [sortedIntervals[0]];

  for (const interval of sortedIntervals.slice(1)) {
    const previous = mergedIntervals[mergedIntervals.length - 1];

    if (interval.startMinute <= previous.endMinute) {
      previous.endMinute = Math.max(previous.endMinute, interval.endMinute);
      continue;
    }

    mergedIntervals.push({ ...interval });
  }

  return mergedIntervals;
}

function deriveFreeBlocksFromOccupiedSlots(
  occupiedSlots: { dayOfWeek: number; startMinute: number; endMinute: number }[],
) {
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();

  for (const slot of occupiedSlots) {
    const current = byDay.get(slot.dayOfWeek) ?? [];
    current.push({
      startMinute: Math.max(slot.startMinute, WEEKDAY_START_MINUTE),
      endMinute: Math.min(slot.endMinute, WEEKDAY_END_MINUTE),
    });
    byDay.set(slot.dayOfWeek, current);
  }

  const freeBlocks: TimetableSlot[] = [];

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    const mergedIntervals = mergeIntervals(
      (byDay.get(dayOfWeek) ?? []).filter(
        (slot) => slot.endMinute > slot.startMinute,
      ),
    );
    let cursor = WEEKDAY_START_MINUTE;

    for (const interval of mergedIntervals) {
      if (interval.startMinute - cursor >= MIN_FREE_BLOCK_MINUTES) {
        freeBlocks.push({
          day_of_week: dayOfWeek,
          start_minute: cursor,
          end_minute: interval.startMinute,
          source: "nusmods",
        });
      }

      cursor = Math.max(cursor, interval.endMinute);
    }

    if (WEEKDAY_END_MINUTE - cursor >= MIN_FREE_BLOCK_MINUTES) {
      freeBlocks.push({
        day_of_week: dayOfWeek,
        start_minute: cursor,
        end_minute: WEEKDAY_END_MINUTE,
        source: "nusmods",
      });
    }
  }

  return freeBlocks;
}

export async function importTimetableFromNusmodsShareUrl(rawUrl: string) {
  const { moduleSelections, semesterNumber } = parseNusmodsShareUrl(rawUrl);
  const occupiedSlots = await buildOccupiedLessonSlots(
    moduleSelections,
    semesterNumber,
  );

  if (occupiedSlots.length === 0) {
    throw new Error(
      "No timetable lessons could be matched from that share link. Check that it includes your selected tutorial and lecture groups.",
    );
  }

  return deriveFreeBlocksFromOccupiedSlots(occupiedSlots);
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

export function formatMinuteOfDay(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDayOfWeek(dayOfWeek: number) {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function parseManualTimeInput(value: string) {
  return parseTimeDigits(value);
}
