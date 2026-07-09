from typing import Protocol

from app.matching.models import (
    ConnectionEdge,
    ModuleRegistration,
    ProfileSummary,
    TimetableSlot,
)


class MatchRepository(Protocol):
    def get_profile(self, user_id: str) -> ProfileSummary | None: ...

    def list_profiles(self, user_ids: list[str]) -> list[ProfileSummary]: ...

    def list_user_module_registrations(
        self,
        *,
        user_id: str,
        semester: str,
    ) -> list[ModuleRegistration]: ...

    def list_module_registrations(
        self,
        *,
        semester: str,
        module_codes: list[str],
        exclude_user_id: str | None = None,
    ) -> list[ModuleRegistration]: ...

    def list_timetable_slots(
        self,
        *,
        user_ids: list[str],
        semester: str,
    ) -> list[TimetableSlot]: ...

    def list_connections(self, *, user_ids: list[str]) -> list[ConnectionEdge]: ...

    def create_high_match_notifications(
        self,
        *,
        user_id: str,
        semester: str,
        candidates: list[dict],
    ) -> None: ...
