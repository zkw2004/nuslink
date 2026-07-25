from fastapi import APIRouter, Depends

from app.auth import AuthenticatedUser, get_current_user
from app.moderation.schemas import (
    ModerationBatchRequest,
    ModerationBatchResponse,
    ModerationCheckRequest,
    ModerationCheckResponse,
)
from app.moderation.service import (
    ModerationProvider,
    OpenAIModerationProvider,
    moderate_batch,
    moderate_content,
)
from app.moderation.supabase_repository import SupabaseModerationRepository

router = APIRouter(prefix="/v1/moderation", tags=["moderation"])


def get_moderation_provider() -> ModerationProvider:
    return OpenAIModerationProvider()


def get_moderation_repository() -> SupabaseModerationRepository:
    return SupabaseModerationRepository()


@router.post("/check", response_model=ModerationCheckResponse)
def check_content(
    payload: ModerationCheckRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: ModerationProvider = Depends(get_moderation_provider),
    repository: SupabaseModerationRepository = Depends(get_moderation_repository),
) -> ModerationCheckResponse:
    result = moderate_content(
        actor_id=current_user.id,
        item=payload,
        provider=provider,
        repository=repository,
    )
    return ModerationCheckResponse(**result.model_dump())


@router.post("/check-batch", response_model=ModerationBatchResponse)
def check_content_batch(
    payload: ModerationBatchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: ModerationProvider = Depends(get_moderation_provider),
    repository: SupabaseModerationRepository = Depends(get_moderation_repository),
) -> ModerationBatchResponse:
    overall_outcome, visible, results = moderate_batch(
        actor_id=current_user.id,
        items=payload.items,
        provider=provider,
        repository=repository,
    )
    return ModerationBatchResponse(
        overall_outcome=overall_outcome,
        visible=visible,
        results=results,
    )
