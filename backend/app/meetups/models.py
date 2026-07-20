from dataclasses import dataclass

from app.matching.models import TimetableSlot


@dataclass(frozen=True)
class MeetupChatParticipant:
    user_id: str


@dataclass(frozen=True)
class MeetupSuggestionCoverage:
    total_participants: int
    included_participants: int
    excluded_participants: int
    available_participants: int


@dataclass(frozen=True)
class RankedMeetupSuggestion:
    id: str
    label: str
    sub: str
    suggestion_date: str
    day_of_week: int
    start_minute: int
    end_minute: int
    coverage: MeetupSuggestionCoverage


ParticipantTimetableMap = dict[str, list[TimetableSlot]]
