import type { TimetableClassSlot, TimetableSlot } from "@appTypes/index";

export const WEEKDAY_START_MINUTE = 8 * 60;
export const WEEKDAY_END_MINUTE = 22 * 60;
export const MIN_FREE_BLOCK_MINUTES = 30;

export const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export const NUSMODS_DAY_INDEX: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export type LessonSelection = {
  lessonType: string;
  lessonReferences: string[];
};

export type ImportPayload = {
  semesterNumber: number;
  moduleSelections: Map<string, LessonSelection[]>;
};

type OccupiedClassSlot = TimetableClassSlot;

export function parseTimeDigits(value: string) {
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
      return ["REC", "RECITATION", "SECTIONALTEACHING"];
    case "SEC":
      return ["SEC", "SECTIONALTEACHING", "RECITATION"];
    case "SEM":
      return ["SEM", "SEMINAR", "SEMINARSTYLEMODULECLASS"];
    default:
      return [normalizedValue];
  }
}

export function matchesLessonSelection(
  selection: LessonSelection,
  lessonType: string,
  classNo?: string,
  lessonIndex?: number,
) {
  const normalizedLessonType = normalizeLessonToken(lessonType);
  const allowedLessonTypes = expandLessonTypeToken(selection.lessonType);
  const normalizedClassNo = classNo ? normalizeLessonToken(classNo) : null;
  const normalizedLessonIndex =
    typeof lessonIndex === "number" ? String(lessonIndex) : null;

  const hasMatchingReference = selection.lessonReferences.some((reference) => {
    const normalizedReference = normalizeLessonToken(reference);

    return (
      normalizedReference === normalizedClassNo ||
      normalizedReference === normalizedLessonIndex
    );
  });

  return hasMatchingReference
    ? allowedLessonTypes.some((allowedType) => {
        return (
          normalizedLessonType === allowedType ||
          normalizedLessonType.startsWith(allowedType) ||
          allowedType.startsWith(normalizedLessonType)
        );
      })
    : false;
}

function splitLessonSelectionParts(rawSelection: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const character of rawSelection) {
    if (character === "(") {
      depth += 1;
      current += character;
      continue;
    }

    if (character === ")") {
      depth = Math.max(0, depth - 1);
      current += character;
      continue;
    }

    if ((character === ";" || character === ",") && depth === 0) {
      const trimmed = current.trim();

      if (trimmed) {
        parts.push(trimmed);
      }

      current = "";
      continue;
    }

    current += character;
  }

  const trimmed = current.trim();

  if (trimmed) {
    parts.push(trimmed);
  }

  return parts;
}

export function parseLessonSelections(rawSelection: string) {
  return splitLessonSelectionParts(rawSelection)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const match = part.match(/^([^:=]+)[:=]\(?([^)]+)\)?$/);

      if (!match) {
        return [];
      }

      const lessonType = match[1].trim();
      const lessonReferences = match[2]
        .split(",")
        .map((reference) => reference.trim())
        .filter(Boolean);

      if (lessonReferences.length === 0) {
        return [];
      }

      return [
        {
          lessonType,
          lessonReferences,
        },
      ];
    });
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

export function parseNusmodsShareUrl(
  rawUrl: string,
  fallbackSemesterNumber: number,
): ImportPayload {
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
  const semesterNumber = semesterMatch
    ? Number(semesterMatch[1])
    : fallbackSemesterNumber;
  const moduleSelections = new Map<string, LessonSelection[]>();

  for (const [rawModuleCode, rawSelection] of params.entries()) {
    const moduleCode = rawModuleCode.trim().toUpperCase();
    if (!moduleCode || !rawSelection.trim()) {
      continue;
    }

    const selections = parseLessonSelections(rawSelection);

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

function mergeIntervals(
  intervals: { startMinute: number; endMinute: number }[],
) {
  if (intervals.length === 0) {
    return [];
  }

  const sortedIntervals = [...intervals].sort(
    (left, right) => left.startMinute - right.startMinute,
  );
  const mergedIntervals = [{ ...sortedIntervals[0] }];

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

export function deriveFreeBlocksFromOccupiedSlots(
  occupiedSlots: OccupiedClassSlot[],
) {
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();

  for (const slot of occupiedSlots) {
    const current = byDay.get(slot.day_of_week) ?? [];
    current.push({
      startMinute: Math.max(slot.start_minute, WEEKDAY_START_MINUTE),
      endMinute: Math.min(slot.end_minute, WEEKDAY_END_MINUTE),
    });
    byDay.set(slot.day_of_week, current);
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

export function formatMinuteOfDay(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDayOfWeek(dayOfWeek: number) {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function formatClassSlotLabel(slot: TimetableClassSlot) {
  return `${slot.module_code} · ${slot.lesson_type} ${slot.class_no}`;
}

export function parseManualTimeInput(value: string) {
  return parseTimeDigits(value);
}
