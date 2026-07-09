from typing import Literal

from pydantic import BaseModel


class MatchBreakdownResponse(BaseModel):
    same_intent: int | None = None
    module_overlap: int | None = None
    shared_skills: int | None = None
    schedule_overlap: int | None
    same_major: int | None = None
    year_proximity: int | None = None
    same_faculty: int | None = None
    same_hall_or_residence: int | None = None
    interest_overlap: int | None = None
    study_mode: int | None = None
    preferred_group_size: int | None = None
    cca_tag_overlap: int | None = None
    mutual_connections: int | None = None


class PeopleMatchResponseItem(BaseModel):
    user_id: str
    display_name: str
    bio: str
    avatar_url: str | None
    faculty: str | None
    major: str | None
    year_of_study: int | None
    hall_residence: str | None
    badge_tier: Literal["bronze", "silver", "gold"] | None
    interests: list[str]
    cca_tags: list[str]
    skills: list[str]
    intents: list[str]
    shared_modules: list[str]
    compatibility_percentage: int
    breakdown: MatchBreakdownResponse
    top_signals: list[str] = []
    match_reasons: list[str] = []
    schedule_summary: str


class PeopleMatchesResponse(BaseModel):
    semester: str
    available_modules: list[str]
    candidates: list[PeopleMatchResponseItem]
