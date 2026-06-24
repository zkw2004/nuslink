from typing import Literal

from pydantic import BaseModel


class MatchBreakdownResponse(BaseModel):
    module_overlap: int | None = None
    target_grade: int | None
    schedule_overlap: int | None
    faculty_major: int | None = None
    year_proximity: int | None = None
    interest_overlap: int | None = None


class PeopleMatchResponseItem(BaseModel):
    user_id: str
    display_name: str
    bio: str
    avatar_url: str | None
    faculty: str | None
    major: str | None
    year_of_study: int | None
    badge_tier: Literal["bronze", "silver", "gold"] | None
    interests: list[str]
    intents: list[str]
    shared_modules: list[str]
    compatibility_percentage: int
    breakdown: MatchBreakdownResponse
    match_reasons: list[str] = []
    target_grade_summary: str
    schedule_summary: str


class PeopleMatchesResponse(BaseModel):
    semester: str
    available_modules: list[str]
    candidates: list[PeopleMatchResponseItem]
