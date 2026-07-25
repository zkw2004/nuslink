import json
from urllib import error, request

from fastapi import HTTPException, status

from app.core.config import settings
from app.moderation.repository import ModerationRepository
from app.moderation.schemas import ModerationCategory, ModerationOutcome


class SupabaseModerationRepository(ModerationRepository):
    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase data access is not configured for moderation.",
            )

        self.base_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": "application/json",
        }

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
        payload = {
            "actor_id": actor_id,
            "subject_type": subject_type,
            "subject_id": subject_id,
            "source_table": source_table,
            "source_column": source_column,
            "content_hash": content_hash,
            "content_excerpt": content_excerpt,
            "outcome": outcome,
            "categories": categories,
            "confidence": confidence,
            "reason": reason,
            "provider": provider,
            "provider_model": provider_model,
            "provider_response": provider_response,
        }
        req = request.Request(
            f"{self.base_url}/content_moderation_events",
            headers=self.headers,
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
        )

        try:
            with request.urlopen(req, timeout=10):
                return
        except error.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase moderation event write failed.",
            ) from exc
        except error.URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach Supabase moderation storage.",
            ) from exc
