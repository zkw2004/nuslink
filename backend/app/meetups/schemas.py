from typing import Literal

from pydantic import BaseModel


ChatKind = Literal["direct", "community", "group"]


class MeetupSuggestionCoverageResponse(BaseModel):
    total_participants: int
    included_participants: int
    excluded_participants: int
    available_participants: int


class MeetupSuggestionItem(BaseModel):
    id: str
    label: str
    sub: str
    day_of_week: int
    start_minute: int
    end_minute: int
    coverage: MeetupSuggestionCoverageResponse


class MeetupSuggestionResponse(BaseModel):
    suggestions: list[MeetupSuggestionItem]
