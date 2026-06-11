from collections import defaultdict

from app.matching.models import ModuleRegistration, ProfileSummary, TimetableSlot

GRADE_POINTS = {
    "A+": 12,
    "A": 11,
    "A-": 10,
    "B+": 9,
    "B": 8,
    "B-": 7,
    "C+": 6,
    "C": 5,
    "C-": 4,
    "D+": 3,
    "D": 2,
    "F": 0,
}


def get_current_semester_string() -> str:
    from datetime import datetime

    now = datetime.utcnow()
    year = now.year
    month = now.month
    academic_year_start = year if month >= 8 else year - 1
    academic_year_end = academic_year_start + 1
    semester_number = 1 if 8 <= month <= 12 else 2

    return f"AY{str(academic_year_start)[-2:]}{str(academic_year_end)[-2:]}S{semester_number}"


def _normalize_grade(grade: str | None) -> str | None:
    if grade is None:
        return None

    normalized = grade.strip().upper()
    return normalized if normalized in GRADE_POINTS else None


def calculate_target_grade_score(
    current_user_modules: dict[str, ModuleRegistration],
    candidate_modules: dict[str, ModuleRegistration],
    shared_modules: list[str],
) -> float | None:
    diffs: list[float] = []

    for module_code in shared_modules:
        current_grade = _normalize_grade(current_user_modules[module_code].target_grade)
        candidate_grade = _normalize_grade(candidate_modules[module_code].target_grade)

        if current_grade is None or candidate_grade is None:
            continue

        diff = abs(GRADE_POINTS[current_grade] - GRADE_POINTS[candidate_grade])
        diffs.append(1 - (diff / 12))

    if not diffs:
        return None

    return sum(diffs) / len(diffs)


def calculate_schedule_overlap_score(
    current_user_slots: list[TimetableSlot],
    candidate_slots: list[TimetableSlot],
) -> tuple[float | None, int]:
    if not current_user_slots or not candidate_slots:
        return None, 0

    candidate_by_day: dict[int, list[TimetableSlot]] = defaultdict(list)
    for slot in candidate_slots:
        candidate_by_day[slot.day_of_week].append(slot)

    overlap_minutes = 0

    for slot in current_user_slots:
        for candidate_slot in candidate_by_day.get(slot.day_of_week, []):
            overlap_start = max(slot.start_minute, candidate_slot.start_minute)
            overlap_end = min(slot.end_minute, candidate_slot.end_minute)
            if overlap_end > overlap_start:
                overlap_minutes += overlap_end - overlap_start

    if overlap_minutes == 0:
        return 0.0, 0

    current_total = sum(slot.end_minute - slot.start_minute for slot in current_user_slots)
    candidate_total = sum(slot.end_minute - slot.start_minute for slot in candidate_slots)
    normalizer = min(current_total, candidate_total)

    if normalizer <= 0:
        return None, 0

    return min(overlap_minutes / normalizer, 1.0), overlap_minutes


def build_module_map(
    registrations: list[ModuleRegistration],
) -> dict[str, dict[str, ModuleRegistration]]:
    module_map: dict[str, dict[str, ModuleRegistration]] = defaultdict(dict)

    for registration in registrations:
        module_map[registration.user_id][registration.module_code] = registration

    return module_map


def build_timetable_map(
    slots: list[TimetableSlot],
) -> dict[str, list[TimetableSlot]]:
    timetable_map: dict[str, list[TimetableSlot]] = defaultdict(list)

    for slot in slots:
        timetable_map[slot.user_id].append(slot)

    return timetable_map


def calculate_overall_score(
    target_grade_score: float | None,
    schedule_score: float | None,
) -> int:
    available_scores = [
        score for score in (target_grade_score, schedule_score) if score is not None
    ]

    if not available_scores:
        return 0

    return round((sum(available_scores) / len(available_scores)) * 100)


def summarize_schedule(schedule_score: float | None, overlap_minutes: int) -> str:
    if schedule_score is None:
        return "Add timetable data to include schedule overlap."

    if overlap_minutes <= 0:
        return "No overlapping free blocks saved yet."

    hours = overlap_minutes // 60
    minutes = overlap_minutes % 60
    duration_label = f"{hours}h {minutes}m" if minutes else f"{hours}h"

    return f"{duration_label} of overlapping availability this week."


def summarize_target_grade(target_grade_score: float | None) -> str:
    if target_grade_score is None:
        return "Add target grades to compare academic goals."

    percentage = round(target_grade_score * 100)

    if percentage >= 85:
        return "Target grades are closely aligned."
    if percentage >= 65:
        return "Target grades are reasonably aligned."
    return "Target grades differ, but the module overlap is still relevant."


def rank_candidates(
    *,
    current_user_id: str,
    profiles: list[ProfileSummary],
    current_user_registrations: list[ModuleRegistration],
    candidate_registrations: list[ModuleRegistration],
    timetable_slots: list[TimetableSlot],
) -> list[dict]:
    current_user_modules = {
        registration.module_code: registration for registration in current_user_registrations
    }
    candidate_module_map = build_module_map(candidate_registrations)
    timetable_map = build_timetable_map(timetable_slots)
    current_user_slots = timetable_map.get(current_user_id, [])
    results: list[dict] = []

    for profile in profiles:
        candidate_modules = candidate_module_map.get(profile.id, {})
        shared_modules = sorted(set(current_user_modules).intersection(candidate_modules))

        if not shared_modules:
            continue

        target_grade_score = calculate_target_grade_score(
            current_user_modules,
            candidate_modules,
            shared_modules,
        )
        schedule_score, overlap_minutes = calculate_schedule_overlap_score(
            current_user_slots,
            timetable_map.get(profile.id, []),
        )
        compatibility_percentage = calculate_overall_score(
            target_grade_score,
            schedule_score,
        )

        results.append(
            {
                "user_id": profile.id,
                "display_name": profile.display_name,
                "bio": profile.bio,
                "avatar_url": profile.avatar_url,
                "faculty": profile.faculty,
                "major": profile.major,
                "year_of_study": profile.year_of_study,
                "badge_tier": profile.badge_tier,
                "interests": profile.interests,
                "intents": profile.intents,
                "shared_modules": shared_modules,
                "compatibility_percentage": compatibility_percentage,
                "breakdown": {
                    "target_grade": None
                    if target_grade_score is None
                    else round(target_grade_score * 100),
                    "schedule_overlap": None
                    if schedule_score is None
                    else round(schedule_score * 100),
                },
                "target_grade_summary": summarize_target_grade(target_grade_score),
                "schedule_summary": summarize_schedule(schedule_score, overlap_minutes),
            }
        )

    results.sort(
        key=lambda result: (
            -result["compatibility_percentage"],
            -len(result["shared_modules"]),
            result["display_name"].lower(),
        )
    )

    return results
