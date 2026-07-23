from typing import Protocol

from app.nudges.models import NudgeContext, NudgePreferences


class NudgeRepository(Protocol):
    def get_preferences(self, *, user_id: str) -> NudgePreferences: ...

    def get_context(self, *, user_id: str, semester: str) -> NudgeContext | None: ...

    def create_notifications(self, notifications: list[dict]) -> int: ...
