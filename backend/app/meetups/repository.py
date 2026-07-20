from typing import Protocol

from app.matching.models import TimetableSlot


class MeetupRepository(Protocol):
    def list_direct_participants(self, *, conversation_id: str) -> list[str]: ...

    def list_group_participants(self, *, group_id: str) -> list[str]: ...

    def list_community_participants(self, *, community_id: str) -> list[str]: ...

    def list_timetable_slots(
        self,
        *,
        user_ids: list[str],
        semester: str,
    ) -> list[TimetableSlot]: ...
