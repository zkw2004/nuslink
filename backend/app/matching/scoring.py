from collections import defaultdict
from dataclasses import dataclass

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

MATCH_WEIGHTS = {
    "module_overlap": 0.28,
    "target_grade": 0.22,
    "schedule_overlap": 0.18,
    "faculty_major": 0.12,
    "year_proximity": 0.08,
    "interest_overlap": 0.12,
}


@dataclass(frozen=True)
class CandidateScore:
    module_overlap: float | None
    target_grade: float | None
    schedule_overlap: float | None
    faculty_major: float | None
    year_proximity: float | None
    interest_overlap: float | None
    overlap_minutes: int


def get_current_semester_string() -> str:
    from datetime import datetime

    now = datetime.utcnow()
    year = now.year
    month = now.month
    academic_year_start = year if month >= 8 else year - 1
    academic_year_end = academic_year_start + 1
    semester_number = 1 if 8 <= month <= 12 else 2

    return (
        f"AY{str(academic_year_start)[-2:]}"
        f"{str(academic_year_end)[-2:]}S{semester_number}"
    )


def _normalize_grade(grade: str | None) -> str | None:
    if grade is None:
        return None

    normalized = grade.strip().upper()
    return normalized if normalized in GRADE_POINTS else None


def calculate_module_overlap_score(
    current_user_modules: dict[str, ModuleRegistration],
    candidate_modules: dict[str, ModuleRegistration],
) -> tuple[float | None, list[str]]:
    current_module_codes = set(current_user_modules)
    candidate_module_codes = set(candidate_modules)
    shared_modules = sorted(current_module_codes.intersection(candidate_module_codes))

    if not shared_modules:
        return None, []

    union_count = len(current_module_codes.union(candidate_module_codes))
    if union_count == 0:
        return None, shared_modules

    return len(shared_modules) / union_count, shared_modules


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

    current_total = sum(
        slot.end_minute - slot.start_minute for slot in current_user_slots
    )
    candidate_total = sum(
        slot.end_minute - slot.start_minute for slot in candidate_slots
    )
    normalizer = min(current_total, candidate_total)

    if normalizer <= 0:
        return None, 0

    return min(overlap_minutes / normalizer, 1.0), overlap_minutes


def calculate_faculty_major_score(
    current_user_profile: ProfileSummary,
    candidate_profile: ProfileSummary,
) -> float | None:
    if (
        current_user_profile.major
        and candidate_profile.major
        and current_user_profile.major.strip().lower()
        == candidate_profile.major.strip().lower()
    ):
        return 1.0

    if (
        current_user_profile.faculty
        and candidate_profile.faculty
        and current_user_profile.faculty.strip().lower()
        == candidate_profile.faculty.strip().lower()
    ):
        return 0.65

    if current_user_profile.faculty or candidate_profile.faculty:
        return 0.0

    return None


def calculate_year_proximity_score(
    current_year: int | None,
    candidate_year: int | None,
) -> float | None:
    if current_year is None or candidate_year is None:
        return None

    diff = abs(current_year - candidate_year)
    return max(0.0, 1.0 - (diff * 0.3))


def calculate_interest_overlap_score(
    current_interests: list[str],
    candidate_interests: list[str],
) -> float | None:
    normalized_current = {interest.strip().lower() for interest in current_interests if interest.strip()}
    normalized_candidate = {
        interest.strip().lower() for interest in candidate_interests if interest.strip()
    }

    if not normalized_current or not normalized_candidate:
        return None

    union_count = len(normalized_current.union(normalized_candidate))
    if union_count == 0:
        return None

    return len(normalized_current.intersection(normalized_candidate)) / union_count


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


def calculate_overall_score(score: CandidateScore) -> int:
    available_scores = {
        key: value
        for key, value in {
            "module_overlap": score.module_overlap,
            "target_grade": score.target_grade,
            "schedule_overlap": score.schedule_overlap,
            "faculty_major": score.faculty_major,
            "year_proximity": score.year_proximity,
            "interest_overlap": score.interest_overlap,
        }.items()
        if value is not None
    }

    if not available_scores:
        return 0

    total_weight = sum(MATCH_WEIGHTS[key] for key in available_scores)
    weighted_total = sum(
        available_scores[key] * MATCH_WEIGHTS[key] for key in available_scores
    )

    if total_weight <= 0:
        return 0

    return round((weighted_total / total_weight) * 100)


def summarize_schedule(schedule_score: float | None, overlap_minutes: int) -> str:
    if schedule_score is None:
        return "Add timetable data to compare weekly availability."

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
    return "Target grades differ, but the shared modules are still relevant."


def build_match_reasons(
    *,
    shared_modules: list[str],
    score: CandidateScore,
    candidate_profile: ProfileSummary,
) -> list[str]:
    reasons: list[str] = []

    if shared_modules:
        if len(shared_modules) == 1:
            reasons.append(f"Share {shared_modules[0]} this semester.")
        else:
            reasons.append(
                f"Share {len(shared_modules)} current-semester modules."
            )

    if score.target_grade is not None and score.target_grade >= 0.8:
        reasons.append("Academic goals are closely aligned.")

    if score.schedule_overlap is not None and score.schedule_overlap >= 0.5:
        reasons.append("Timetable overlap makes coordination easier.")

    if score.faculty_major == 1.0 and candidate_profile.major:
        reasons.append(f"Same major: {candidate_profile.major}.")
    elif score.faculty_major is not None and score.faculty_major >= 0.65:
        reasons.append("Same faculty academic context.")

    if score.year_proximity is not None and score.year_proximity >= 0.7:
        reasons.append("Close year-of-study progression.")

    if score.interest_overlap is not None and score.interest_overlap >= 0.34:
        reasons.append("Shared academic interests.")

    return reasons[:3]


def rank_candidates(
    *,
    current_user_id: str,
    current_user_profile: ProfileSummary,
    profiles: list[ProfileSummary],
    current_user_registrations: list[ModuleRegistration],
    candidate_registrations: list[ModuleRegistration],
    timetable_slots: list[TimetableSlot],
) -> list[dict]:
    current_user_modules = {
        registration.module_code: registration
        for registration in current_user_registrations
    }
    candidate_module_map = build_module_map(candidate_registrations)
    timetable_map = build_timetable_map(timetable_slots)
    current_user_slots = timetable_map.get(current_user_id, [])
    results: list[dict] = []

    for profile in profiles:
        candidate_modules = candidate_module_map.get(profile.id, {})
        module_overlap_score, shared_modules = calculate_module_overlap_score(
            current_user_modules,
            candidate_modules,
        )

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
        faculty_major_score = calculate_faculty_major_score(
            current_user_profile,
            profile,
        )
        year_proximity_score = calculate_year_proximity_score(
            current_user_profile.year_of_study,
            profile.year_of_study,
        )
        interest_overlap_score = calculate_interest_overlap_score(
            current_user_profile.interests,
            profile.interests,
        )

        candidate_score = CandidateScore(
            module_overlap=module_overlap_score,
            target_grade=target_grade_score,
            schedule_overlap=schedule_score,
            faculty_major=faculty_major_score,
            year_proximity=year_proximity_score,
            interest_overlap=interest_overlap_score,
            overlap_minutes=overlap_minutes,
        )
        compatibility_percentage = calculate_overall_score(candidate_score)

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
                    "module_overlap": None
                    if module_overlap_score is None
                    else round(module_overlap_score * 100),
                    "target_grade": None
                    if target_grade_score is None
                    else round(target_grade_score * 100),
                    "schedule_overlap": None
                    if schedule_score is None
                    else round(schedule_score * 100),
                    "faculty_major": None
                    if faculty_major_score is None
                    else round(faculty_major_score * 100),
                    "year_proximity": None
                    if year_proximity_score is None
                    else round(year_proximity_score * 100),
                    "interest_overlap": None
                    if interest_overlap_score is None
                    else round(interest_overlap_score * 100),
                },
                "match_reasons": build_match_reasons(
                    shared_modules=shared_modules,
                    score=candidate_score,
                    candidate_profile=profile,
                ),
                "target_grade_summary": summarize_target_grade(target_grade_score),
                "schedule_summary": summarize_schedule(
                    schedule_score,
                    overlap_minutes,
                ),
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
