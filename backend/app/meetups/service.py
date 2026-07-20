from collections import defaultdict
from dataclasses import asdict
from datetime import date, timedelta

from app.matching.models import TimetableSlot
from app.meetups.models import MeetupSuggestionCoverage, RankedMeetupSuggestion

DAY_LABELS = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    7: "Sun",
}


def build_meetup_suggestions(
    participant_ids: list[str],
    timetable_slots: list[TimetableSlot],
) -> list[dict]:
    unique_participant_ids = list(dict.fromkeys(participant_ids))
    total_participants = len(unique_participant_ids)
    slots_by_user = _build_slots_by_user(timetable_slots)
    included_participant_ids = [
        user_id for user_id in unique_participant_ids if slots_by_user.get(user_id)
    ]
    included_count = len(included_participant_ids)
    excluded_count = total_participants - included_count

    if included_count < 2:
        return []

    ranked_segments = _rank_segments(
        included_participant_ids=included_participant_ids,
        slots_by_user=slots_by_user,
        total_participants=total_participants,
        excluded_count=excluded_count,
        today=date.today(),
    )

    return [asdict(segment) for segment in ranked_segments[:3]]


def _build_slots_by_user(
    timetable_slots: list[TimetableSlot],
) -> dict[str, list[TimetableSlot]]:
    slots_by_user: dict[str, list[TimetableSlot]] = defaultdict(list)

    for slot in timetable_slots:
        slots_by_user[slot.user_id].append(slot)

    return slots_by_user


def _rank_segments(
    *,
    included_participant_ids: list[str],
    slots_by_user: dict[str, list[TimetableSlot]],
    total_participants: int,
    excluded_count: int,
    today: date,
) -> list[RankedMeetupSuggestion]:
    segments: list[RankedMeetupSuggestion] = []

    for day_of_week in range(1, 8):
        boundaries = {
            minute
            for user_id in included_participant_ids
            for slot in slots_by_user[user_id]
            if slot.day_of_week == day_of_week
            for minute in (slot.start_minute, slot.end_minute)
        }
        sorted_boundaries = sorted(boundaries)

        if len(sorted_boundaries) < 2:
            continue

        for start_minute, end_minute in zip(
            sorted_boundaries,
            sorted_boundaries[1:],
            strict=False,
        ):
            if end_minute <= start_minute:
                continue

            available_participant_ids = [
                user_id
                for user_id in included_participant_ids
                if any(
                    slot.day_of_week == day_of_week
                    and slot.start_minute <= start_minute
                    and slot.end_minute >= end_minute
                    for slot in slots_by_user[user_id]
                )
            ]

            available_count = len(available_participant_ids)

            if available_count < 2:
                continue

            coverage = MeetupSuggestionCoverage(
                total_participants=total_participants,
                included_participants=len(included_participant_ids),
                excluded_participants=excluded_count,
                available_participants=available_count,
            )
            next_occurrence = _next_occurrence_for_day(day_of_week, today)
            calendar_date = _format_calendar_date(next_occurrence)
            label = (
                f"{DAY_LABELS[day_of_week]} · {calendar_date} · "
                f"{_format_time_range(start_minute, end_minute)}"
            )
            sub = f"{available_count}/{total_participants} free"

            segments.append(
                RankedMeetupSuggestion(
                    id=(
                        f"{next_occurrence.isoformat()}-"
                        f"{day_of_week}-{start_minute}-{end_minute}"
                    ),
                    label=label,
                    sub=sub,
                    suggestion_date=next_occurrence.isoformat(),
                    day_of_week=day_of_week,
                    start_minute=start_minute,
                    end_minute=end_minute,
                    coverage=coverage,
                )
            )

    deduped: dict[tuple[str, int, int], RankedMeetupSuggestion] = {}
    for segment in segments:
        key = (segment.suggestion_date, segment.start_minute, segment.end_minute)
        existing = deduped.get(key)

        if existing is None or _sort_key(segment) < _sort_key(existing):
            deduped[key] = segment

    return sorted(deduped.values(), key=_sort_key)


def _sort_key(segment: RankedMeetupSuggestion) -> tuple[int, int, int, int]:
    duration = segment.end_minute - segment.start_minute
    return (
        _date_sort_value(segment.suggestion_date),
        segment.start_minute,
        -segment.coverage.available_participants,
        -duration,
    )


def _next_occurrence_for_day(day_of_week: int, today: date) -> date:
    offset = (day_of_week - today.isoweekday()) % 7
    return today + timedelta(days=offset)


def _format_calendar_date(value: date) -> str:
    return f"{value.day} {value.strftime('%b')}"


def _date_sort_value(value: str) -> int:
    year, month, day = (int(part) for part in value.split("-"))
    return year * 10000 + month * 100 + day


def _format_time_range(start_minute: int, end_minute: int) -> str:
    return f"{_format_time(start_minute)} - {_format_time(end_minute)}"


def _format_time(minute_of_day: int) -> str:
    hour = minute_of_day // 60
    minute = minute_of_day % 60
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {suffix}"
