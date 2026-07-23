import json
from datetime import datetime
from urllib import error, parse, request

from fastapi import HTTPException, status

from app.core.config import settings
from app.nudges.models import ConnectedModulePeer, NudgeContext, NudgePreferences
from app.nudges.repository import NudgeRepository


class SupabaseNudgeRepository(NudgeRepository):
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

    def get_preferences(self, *, user_id: str) -> NudgePreferences:
        rows = self._get(
            "nudge_preferences",
            {
                "select": "time_enabled,behaviour_enabled,network_enabled",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if not rows:
            return NudgePreferences()

        row = rows[0]
        return NudgePreferences(
            time_enabled=bool(row["time_enabled"]),
            behaviour_enabled=bool(row["behaviour_enabled"]),
            network_enabled=bool(row["network_enabled"]),
        )

    def get_context(self, *, user_id: str, semester: str) -> NudgeContext | None:
        profiles = self._get(
            "profiles",
            {
                "select": "id,created_at",
                "id": f"eq.{user_id}",
                "onboarding_completed": "eq.true",
                "limit": "1",
            },
        )
        if not profiles:
            return None

        module_rows = self._get(
            "user_modules",
            {
                "select": "module_code",
                "user_id": f"eq.{user_id}",
                "semester": f"eq.{semester}",
            },
        )
        module_codes = tuple(sorted({row["module_code"] for row in module_rows}))
        membership_rows = self._get(
            "group_members",
            {
                "select": "group_id",
                "user_id": f"eq.{user_id}",
                "deleted_at": "is.null",
                "left_at": "is.null",
            },
        )
        group_ids = sorted({row["group_id"] for row in membership_rows})
        active_group_count = 0
        if group_ids:
            group_rows = self._get(
                "groups",
                {
                    "select": "id",
                    "id": _build_in_filter(group_ids),
                    "semester": f"eq.{semester}",
                    "is_active": "eq.true",
                },
            )
            active_group_count = len(group_rows)
        timetable_rows = self._get(
            "timetable_slots",
            {
                "select": "id",
                "user_id": f"eq.{user_id}",
                "semester": f"eq.{semester}",
            },
        )

        return NudgeContext(
            user_id=user_id,
            profile_created_at=_parse_datetime(profiles[0]["created_at"]),
            semester=semester,
            module_codes=module_codes,
            active_group_count=active_group_count,
            timetable_slot_count=len(timetable_rows),
            connected_peers=self._get_connected_peers(
                user_id=user_id,
                semester=semester,
            ),
        )

    def _get_connected_peers(
        self,
        *,
        user_id: str,
        semester: str,
    ) -> tuple[ConnectedModulePeer, ...]:
        connection_rows = self._get(
            "connections",
            {
                "select": "user_a_id,user_b_id",
                "or": f"(user_a_id.eq.{user_id},user_b_id.eq.{user_id})",
            },
        )
        peer_ids = sorted(
            {
                row["user_b_id"] if row["user_a_id"] == user_id else row["user_a_id"]
                for row in connection_rows
            }
        )
        if not peer_ids:
            return ()

        peer_filter = _build_in_filter(peer_ids)
        profile_rows = self._get(
            "profiles",
            {
                "select": "id,display_name",
                "id": peer_filter,
                "onboarding_completed": "eq.true",
            },
        )
        module_rows = self._get(
            "user_modules",
            {
                "select": "user_id,module_code",
                "user_id": peer_filter,
                "semester": f"eq.{semester}",
            },
        )
        modules_by_user: dict[str, list[str]] = {}
        for row in module_rows:
            modules_by_user.setdefault(row["user_id"], []).append(row["module_code"])

        return tuple(
            ConnectedModulePeer(
                user_id=row["id"],
                display_name=row.get("display_name") or "A connection",
                module_codes=tuple(sorted(set(modules_by_user.get(row["id"], [])))),
            )
            for row in profile_rows
        )

    def create_notifications(self, notifications: list[dict]) -> int:
        if not notifications:
            return 0

        headers = {
            **self.headers,
            "Prefer": "resolution=ignore-duplicates,return=representation",
        }
        req = request.Request(
            f"{self.base_url}/notifications",
            data=json.dumps(notifications).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=10) as response:
                rows = json.loads(response.read().decode("utf-8") or "[]")
                return len(rows)
        except error.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase insert failed for notifications.",
            ) from exc
        except error.URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach Supabase data API.",
            ) from exc


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _build_in_filter(values: list[str]) -> str:
    quoted = ",".join(f'"{value}"' for value in values)
    return f"in.({quoted})"
