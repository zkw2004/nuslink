from dataclasses import dataclass


@dataclass(frozen=True)
class ModuleRegistration:
    user_id: str
    module_code: str


@dataclass(frozen=True)
class TimetableSlot:
    user_id: str
    day_of_week: int
    start_minute: int
    end_minute: int


@dataclass(frozen=True)
class ProfileSummary:
    id: str
    display_name: str
    bio: str
    avatar_url: str | None
    faculty: str | None
    major: str | None
    year_of_study: int | None
    badge_tier: str | None
    interests: list[str]
    project_tags: list[str]
    cca_tags: list[str]
    intents: list[str]
    onboarding_completed: bool
    study_mode: str | None = None
    study_style: str | None = None
    preferred_group_size: int | None = None
