import json
from urllib import error, parse, request

from fastapi import HTTPException, status

from app.core.config import settings
from app.matching.models import TimetableSlot
from app.meetups.repository import MeetupRepository


class SupabaseMeetupRepository(MeetupRepository):
    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase data access is not configured for the backend.",
            )

        self.base_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": "application/json",
        }

    def _get(self, table: str, params: dict[str, str]) -> list[dict]:
        query = parse.urlencode(params)
        req = request.Request(
            f"{self.base_url}/{table}?{query}",
            headers=self.headers,
            method="GET",
        )

        try:
            with request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase query failed for {table}.",
            ) from exc
        except error.URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach Supabase data API.",
            ) from exc

    def list_direct_participants(self, *, conversation_id: str) -> list[str]:
        rows = self._get(
            "direct_conversation_members",
            {
                "select": "user_id",
                "conversation_id": f"eq.{conversation_id}",
                "deleted_at": "is.null",
            },
        )
        return [row["user_id"] for row in rows]

    def list_group_participants(self, *, group_id: str) -> list[str]:
        rows = self._get(
            "group_members",
            {
                "select": "user_id",
                "group_id": f"eq.{group_id}",
                "deleted_at": "is.null",
            },
        )
        return [row["user_id"] for row in rows]

    def list_community_participants(self, *, community_id: str) -> list[str]:
        rows = self._get(
            "community_members",
            {
                "select": "user_id",
                "community_id": f"eq.{community_id}",
                "deleted_at": "is.null",
            },
        )
        return [row["user_id"] for row in rows]

    def list_timetable_slots(
        self,
        *,
        user_ids: list[str],
        semester: str,
    ) -> list[TimetableSlot]:
        if not user_ids:
            return []

        rows = self._get(
            "timetable_slots",
            {
                "select": "user_id,day_of_week,start_minute,end_minute",
                "semester": f"eq.{semester}",
                "user_id": _build_in_filter(user_ids),
            },
        )

        return [
            TimetableSlot(
                user_id=row["user_id"],
                day_of_week=row["day_of_week"],
                start_minute=row["start_minute"],
                end_minute=row["end_minute"],
            )
            for row in rows
        ]


def _build_in_filter(values: list[str]) -> str:
    quoted = ",".join(f'"{value}"' for value in values)
    return f"in.({quoted})"
