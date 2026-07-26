from typing import Literal

from pydantic import BaseModel, Field

MatchFeedbackEventType = Literal["view", "skip", "accept", "chat_start"]


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
    headline: str | None = None
    headline_moderation_outcome: Literal[
        "allowed", "flagged", "blocked", "error"
    ] = "allowed"
    bio: str
    bio_moderation_outcome: Literal[
        "allowed", "flagged", "blocked", "error"
    ] = "allowed"
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


class MatchFeedbackEventCreate(BaseModel):
    target_user_id: str
    event_type: MatchFeedbackEventType
    semester: str | None = None
    module_code: str | None = None
    compatibility_percentage: int | None = Field(default=None, ge=0, le=100)
    top_signals: list[str] = Field(default_factory=list)
    shared_modules: list[str] = Field(default_factory=list)
    metadata: dict[str, object] = Field(default_factory=dict)


class MatchFeedbackEventResponse(BaseModel):
    ok: bool = True
