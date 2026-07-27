from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.group_drafting.schemas import (
    GroupDraftProviderHealthResponse,
    GroupDraftRequest,
    GroupDraftResponse,
)
from app.group_drafting.service import (
    GeminiGroupDraftProvider,
    GroupDraftingError,
    GroupDraftProvider,
    create_group_draft,
)

router = APIRouter(prefix="/v1/groups", tags=["groups"])


def get_group_draft_provider() -> GroupDraftProvider:
    return GeminiGroupDraftProvider()


@router.get("/draft/provider-health", response_model=GroupDraftProviderHealthResponse)
def provider_health(
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: GroupDraftProvider = Depends(get_group_draft_provider),
) -> GroupDraftProviderHealthResponse:
    del current_user
    configured = bool(settings.gemini_api_key)

    try:
        provider.check_health()
    except GroupDraftingError as exc:
        return GroupDraftProviderHealthResponse(
            provider=provider.provider_name,
            model=provider.model_name,
            configured=configured,
            ok=False,
            error=str(exc),
        )

    return GroupDraftProviderHealthResponse(
        provider=provider.provider_name,
        model=provider.model_name,
        configured=configured,
        ok=True,
        error=None,
    )


@router.post("/draft", response_model=GroupDraftResponse)
def draft_group(
    payload: GroupDraftRequest,
    _: AuthenticatedUser = Depends(get_current_user),
    provider: GroupDraftProvider = Depends(get_group_draft_provider),
) -> GroupDraftResponse:
    try:
        return create_group_draft(payload.prompt, provider)
    except GroupDraftingError as exc:
        detail = str(exc)
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if detail == "Gemini group drafting is not configured."
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=response_status, detail=detail) from exc
