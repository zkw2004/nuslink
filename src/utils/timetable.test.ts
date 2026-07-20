import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveFreeBlocksFromOccupiedSlots,
  formatClassSlotLabel,
  formatDayOfWeek,
  formatMinuteOfDay,
  matchesLessonSelection,
  parseLessonSelections,
  parseManualTimeInput,
  parseNusmodsShareUrl,
} from "./timetable.ts";

test("parses NUSMods share URLs from normal query strings", () => {
  const payload = parseNusmodsShareUrl(
    "https://nusmods.com/timetable/sem-1/share?CS2040S=LEC:0;TUT:3&MA1521=TUT:1",
    2,
  );

  assert.equal(payload.semesterNumber, 1);
  assert.deepEqual(Array.from(payload.moduleSelections.keys()), [
    "CS2040S",
    "MA1521",
  ]);
  assert.deepEqual(payload.moduleSelections.get("CS2040S"), [
    { lessonType: "LEC", lessonReferences: ["0"] },
    { lessonType: "TUT", lessonReferences: ["3"] },
  ]);
});

test("parses NUSMods share URLs from hash query strings", () => {
  const payload = parseNusmodsShareUrl(
    "https://nusmods.com/timetable/sem-2/share#/?CS2030S=LAB=(2,5)",
    1,
  );

  assert.equal(payload.semesterNumber, 2);
  assert.deepEqual(payload.moduleSelections.get("CS2030S"), [
    { lessonType: "LAB", lessonReferences: ["2", "5"] },
  ]);
});

test("parses full NUSMods share URLs that use comma-separated selections", () => {
  const payload = parseNusmodsShareUrl(
    "https://nusmods.com/timetable/sem-1/share?CS2100=TUT:39,LAB:39,LEC:2&CS2101=&CS2103T=LEC:G09&DAO2703=SEC:A8&FIN2704=LEC:A3,TUT:G12&RE1707=SEC:A2",
    2,
  );

  assert.equal(payload.semesterNumber, 1);
  assert.deepEqual(payload.moduleSelections.get("CS2100"), [
    { lessonType: "TUT", lessonReferences: ["39"] },
    { lessonType: "LAB", lessonReferences: ["39"] },
    { lessonType: "LEC", lessonReferences: ["2"] },
  ]);
  assert.deepEqual(payload.moduleSelections.get("CS2103T"), [
    { lessonType: "LEC", lessonReferences: ["G09"] },
  ]);
  assert.equal(payload.moduleSelections.has("CS2101"), false);
});

test("matches common NUSMods lesson abbreviations", () => {
  const lectureSelection = parseLessonSelections("LEC:0")[0];
  const recitationSelection = parseLessonSelections("REC:1")[0];

  assert.equal(matchesLessonSelection(lectureSelection, "Lecture", "1", 0), true);
  assert.equal(matchesLessonSelection(lectureSelection, "Tutorial", "1", 0), false);
  assert.equal(
    matchesLessonSelection(recitationSelection, "Sectional Teaching", "A1", 1),
    true,
  );
});

test("matches class numbers from newer NUSMods share links", () => {
  const selections = parseLessonSelections("TUT:39,LAB:39,LEC:G09");

  assert.equal(matchesLessonSelection(selections[0], "Tutorial", "39", 2), true);
  assert.equal(matchesLessonSelection(selections[1], "Laboratory", "39", 4), true);
  assert.equal(matchesLessonSelection(selections[2], "Lecture", "G09", 1), true);
});

test("derives weekday free blocks from occupied lessons", () => {
  const freeBlocks = deriveFreeBlocksFromOccupiedSlots([
    {
      module_code: "CS2040S",
      lesson_type: "Lecture",
      class_no: "1",
      day_of_week: 1,
      start_minute: 10 * 60,
      end_minute: 12 * 60,
    },
    {
      module_code: "CS2040S",
      lesson_type: "Tutorial",
      class_no: "T01",
      day_of_week: 1,
      start_minute: 11 * 60 + 30,
      end_minute: 13 * 60,
    },
    {
      module_code: "MA1521",
      lesson_type: "Lecture",
      class_no: "1",
      day_of_week: 2,
      start_minute: 8 * 60 + 15,
      end_minute: 9 * 60 + 45,
    },
  ]);

  assert.deepEqual(
    freeBlocks.filter((slot) => slot.day_of_week === 1),
    [
      {
        day_of_week: 1,
        start_minute: 8 * 60,
        end_minute: 10 * 60,
        source: "nusmods",
      },
      {
        day_of_week: 1,
        start_minute: 13 * 60,
        end_minute: 22 * 60,
        source: "nusmods",
      },
    ],
  );
  assert.equal(
    freeBlocks.some(
      (slot) =>
        slot.day_of_week === 2 &&
        slot.start_minute === 8 * 60 &&
        slot.end_minute === 8 * 60 + 15,
    ),
    false,
  );
});

test("formats and validates manual timetable times", () => {
  assert.equal(parseManualTimeInput("09:30"), 570);
  assert.equal(formatMinuteOfDay(570), "09:30");
  assert.equal(formatDayOfWeek(6), "Sat");
  assert.equal(
    formatClassSlotLabel({
      module_code: "CS2040S",
      lesson_type: "Tutorial",
      class_no: "T03",
      day_of_week: 3,
      start_minute: 900,
      end_minute: 960,
    }),
    "CS2040S · Tutorial T03",
  );
  assert.throws(() => parseManualTimeInput("25:00"), /valid 24-hour clock/);
});
