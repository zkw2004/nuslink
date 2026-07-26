from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, get_current_user
from app.group_drafting.schemas import GroupDraftRequest, GroupDraftResponse
from app.group_drafting.service import (
    GeminiGroupDraftProvider,
    GroupDraftingError,
    GroupDraftProvider,
    create_group_draft,
)

router = APIRouter(prefix="/v1/groups", tags=["groups"])


def get_group_draft_provider() -> GroupDraftProvider:
    return GeminiGroupDraftProvider()


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
