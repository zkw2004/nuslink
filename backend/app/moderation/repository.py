from typing import Protocol

from app.moderation.schemas import ModerationCategory, ModerationOutcome


class ModerationRepository(Protocol):
    def record_event(
        self,
        *,
        actor_id: str,
        subject_type: str,
        subject_id: str | None,
        source_table: str | None,
        source_column: str | None,
        content_hash: str,
        content_excerpt: str,
        outcome: ModerationOutcome,
        categories: list[ModerationCategory],
        confidence: float | None,
        reason: str | None,
        provider: str,
        provider_model: str | None,
        provider_response: dict[str, object] | None,
    ) -> None:
        ...
