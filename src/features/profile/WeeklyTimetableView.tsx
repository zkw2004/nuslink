import { ScrollView, Text, View } from "react-native";

import {
  formatDayOfWeek,
  formatMinuteOfDay,
} from "@services/timetableService";
import type { TimetableSlot } from "@appTypes/index";

type WeeklyTimetableViewProps = {
  slots: TimetableSlot[];
  emptyLabel?: string;
};

const DAY_COLUMNS = [1, 2, 3, 4, 5];
const START_MINUTE = 8 * 60;
const END_MINUTE = 22 * 60;
const HOUR_HEIGHT = 40;
const DAY_WIDTH = 112;
const LABEL_WIDTH = 48;
const GRID_HEIGHT = ((END_MINUTE - START_MINUTE) / 60) * HOUR_HEIGHT;

function getSlotTop(slot: TimetableSlot) {
  return ((slot.start_minute - START_MINUTE) / 60) * HOUR_HEIGHT;
}

function getSlotHeight(slot: TimetableSlot) {
  return Math.max(
    24,
    ((slot.end_minute - slot.start_minute) / 60) * HOUR_HEIGHT,
  );
}

function getVisibleSlots(slots: TimetableSlot[]) {
  return slots
    .filter(
      (slot) =>
        DAY_COLUMNS.includes(slot.day_of_week) &&
        slot.end_minute > START_MINUTE &&
        slot.start_minute < END_MINUTE,
    )
    .map((slot) => ({
      ...slot,
      start_minute: Math.max(slot.start_minute, START_MINUTE),
      end_minute: Math.min(slot.end_minute, END_MINUTE),
    }))
    .sort(
      (left, right) =>
        left.day_of_week - right.day_of_week ||
        left.start_minute - right.start_minute,
    );
}

export function WeeklyTimetableView({
  slots,
  emptyLabel = "No availability blocks saved yet.",
}: WeeklyTimetableViewProps) {
  const visibleSlots = getVisibleSlots(slots);
  const slotsByDay = new Map<number, TimetableSlot[]>();

  for (const day of DAY_COLUMNS) {
    slotsByDay.set(day, []);
  }

  for (const slot of visibleSlots) {
    slotsByDay.set(slot.day_of_week, [
      ...(slotsByDay.get(slot.day_of_week) ?? []),
      slot,
    ]);
  }

  if (visibleSlots.length === 0) {
    return (
      <View className="rounded-[16px] border border-dashed border-[#D7DEE9] bg-[#F7F9FC] px-4 py-5">
        <Text className="text-center text-[13px] leading-5 text-[#5C6370]">
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[16px] border border-[#E4E9F1] bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 12 }}
      >
        <View>
          <View className="flex-row border-b border-[#E4E9F1] bg-[#F7F9FC]">
            <View style={{ width: LABEL_WIDTH }} />
            {DAY_COLUMNS.map((day) => (
              <View
                key={`header-${day}`}
                className="items-center border-l border-[#E4E9F1] py-3"
                style={{ width: DAY_WIDTH }}
              >
                <Text className="text-[12px] font-bold uppercase tracking-[0.5px] text-[#5C6370]">
                  {formatDayOfWeek(day)}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row">
            <View
              className="bg-[#F7F9FC]"
              style={{ width: LABEL_WIDTH, height: GRID_HEIGHT }}
            >
              {Array.from({ length: 15 }).map((_, index) => {
                const minute = START_MINUTE + index * 60;
                return (
                  <Text
                    key={`hour-${minute}`}
                    className="absolute right-2 text-[10px] text-[#9AA0AB]"
                    style={{ top: index * HOUR_HEIGHT - 7 }}
                  >
                    {formatMinuteOfDay(minute)}
                  </Text>
                );
              })}
            </View>

            {DAY_COLUMNS.map((day) => (
              <View
                key={`day-${day}`}
                className="relative border-l border-[#E4E9F1]"
                style={{ width: DAY_WIDTH, height: GRID_HEIGHT }}
              >
                {Array.from({ length: 14 }).map((_, index) => (
                  <View
                    key={`line-${day}-${index}`}
                    className="absolute left-0 right-0 border-t border-[#EEF2F7]"
                    style={{ top: index * HOUR_HEIGHT }}
                  />
                ))}

                {(slotsByDay.get(day) ?? []).map((slot) => (
                  <View
                    key={`${slot.day_of_week}-${slot.start_minute}-${slot.end_minute}-${slot.source}`}
                    className="absolute left-2 right-2 rounded-[10px] border border-[#B9CAE0] bg-[#E1EAF5] px-2 py-1"
                    style={{
                      top: getSlotTop(slot),
                      height: getSlotHeight(slot),
                    }}
                  >
                    <Text
                      className="text-[11px] font-bold text-[#0F1115]"
                      numberOfLines={1}
                    >
                      Free
                    </Text>
                    <Text
                      className="mt-0.5 text-[10px] leading-3 text-[#5B7BA3]"
                      numberOfLines={2}
                    >
                      {formatMinuteOfDay(slot.start_minute)} -{" "}
                      {formatMinuteOfDay(slot.end_minute)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
