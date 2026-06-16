from fastapi import APIRouter, Depends

from app.auth import AuthenticatedUser, get_current_user
from app.communities.schemas import CommunityCreateResponse, CreateCommunityRequest
from app.communities.supabase_repository import SupabaseCommunityRepository

router = APIRouter(prefix="/v1/communities", tags=["communities"])


def get_community_repository() -> SupabaseCommunityRepository:
    return SupabaseCommunityRepository()


def _normalize_tags(tags: list[str]) -> list[str]:
    normalized_tags: list[str] = []
    seen_tags: set[str] = set()

    for tag in tags:
        cleaned_tag = tag.strip()

        if not cleaned_tag:
            continue

        normalized_key = cleaned_tag.lower()
        if normalized_key in seen_tags:
            continue

        seen_tags.add(normalized_key)
        normalized_tags.append(cleaned_tag[:24])

        if len(normalized_tags) == 6:
            break

    return normalized_tags


@router.post("", response_model=CommunityCreateResponse)
def create_community(
    payload: CreateCommunityRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    repository: SupabaseCommunityRepository = Depends(get_community_repository),
) -> CommunityCreateResponse:
    return repository.create_community(
        creator_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip(),
        tags=_normalize_tags(payload.tags),
        join_policy=payload.privacy,
    )
