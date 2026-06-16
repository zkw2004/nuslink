import json
from urllib import error, request

from fastapi import HTTPException, status

from app.communities.schemas import CommunityCreateResponse
from app.core.config import settings


class SupabaseCommunityRepository:
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
            "Prefer": "return=representation",
        }

    def create_community(
        self,
        *,
        creator_id: str,
        name: str,
        description: str,
        tags: list[str],
        join_policy: str,
    ) -> CommunityCreateResponse:
        payload = {
            "creator_id": creator_id,
            "name": name,
            "description": description,
            "tags": tags,
            "join_policy": join_policy,
            "type": "user_created",
        }
        req = request.Request(
            f"{self.base_url}/communities",
            headers=self.headers,
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
        )

        try:
            with request.urlopen(req, timeout=10) as response:
                rows = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase query failed for communities.",
            ) from exc
        except error.URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach Supabase data API.",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Community creation did not return a record.",
            )

        row = rows[0]
        return CommunityCreateResponse(
            id=row["id"],
            name=row["name"],
            description=row.get("description") or "",
            tags=row.get("tags") or [],
            join_policy=row["join_policy"],
            creator_id=row["creator_id"],
        )
