import json
from urllib import error, parse, request

from fastapi import HTTPException, status

from app.core.config import settings
from app.matching.models import ModuleRegistration, ProfileSummary, TimetableSlot
from app.matching.repository import MatchRepository

PROFILE_SELECT_FIELDS = (
    "id,display_name,bio,avatar_url,faculty,major,"
    "year_of_study,hall_rc,study_style,preferred_group_size,"
    "badge_tier,interests,intents,onboarding_completed"
)


class SupabaseMatchRepository(MatchRepository):
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

    def get_profile(self, user_id: str) -> ProfileSummary | None:
        rows = self._get(
            "profiles",
            {
                "select": PROFILE_SELECT_FIELDS,
                "id": f"eq.{user_id}",
                "limit": "1",
            },
        )

        if not rows:
            return None

        return _map_profile(rows[0])

    def list_profiles(self, user_ids: list[str]) -> list[ProfileSummary]:
        if not user_ids:
            return []

        rows = self._get(
            "profiles",
            {
                "select": PROFILE_SELECT_FIELDS,
                "id": _build_in_filter(user_ids),
                "onboarding_completed": "eq.true",
            },
        )

        return [_map_profile(row) for row in rows]

    def list_user_module_registrations(
        self,
        *,
        user_id: str,
        semester: str,
    ) -> list[ModuleRegistration]:
        rows = self._get(
            "user_modules",
            {
                "select": "user_id,module_code",
                "user_id": f"eq.{user_id}",
                "semester": f"eq.{semester}",
            },
        )

        return [
            ModuleRegistration(
                user_id=row["user_id"],
                module_code=row["module_code"],
            )
            for row in rows
        ]

    def list_module_registrations(
        self,
        *,
        semester: str,
        module_codes: list[str],
        exclude_user_id: str | None = None,
    ) -> list[ModuleRegistration]:
        if not module_codes:
            return []

        params = {
            "select": "user_id,module_code",
            "semester": f"eq.{semester}",
            "module_code": _build_in_filter(module_codes),
        }

        if exclude_user_id:
            params["user_id"] = f"neq.{exclude_user_id}"

        rows = self._get("user_modules", params)
        return [
            ModuleRegistration(
                user_id=row["user_id"],
                module_code=row["module_code"],
            )
            for row in rows
        ]

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


def _map_profile(row: dict) -> ProfileSummary:
    return ProfileSummary(
        id=row["id"],
        display_name=row.get("display_name") or "",
        bio=row.get("bio") or "",
        avatar_url=row.get("avatar_url"),
        faculty=row.get("faculty"),
        major=row.get("major"),
        year_of_study=row.get("year_of_study"),
        badge_tier=row.get("badge_tier"),
        interests=row.get("interests") or [],
        intents=row.get("intents") or [],
        onboarding_completed=bool(row.get("onboarding_completed")),
        hall_rc=row.get("hall_rc"),
        study_style=row.get("study_style"),
        preferred_group_size=row.get("preferred_group_size"),
    )
