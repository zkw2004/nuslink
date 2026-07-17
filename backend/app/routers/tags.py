from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, get_current_user
from app.tag_normalization.schemas import (
    TagNormalizationRequest,
    TagNormalizationResponse,
)
from app.tag_normalization.service import (
    OpenAITagNormalizationProvider,
    SupabaseTagNormalizationMemoryStore,
    TagNormalizationError,
    TagNormalizationMemoryStore,
    TagNormalizationProvider,
    normalize_tags,
)

router = APIRouter(prefix="/v1/tags", tags=["tags"])


def get_tag_normalization_provider() -> TagNormalizationProvider:
    return OpenAITagNormalizationProvider()


def get_tag_normalization_memory_store() -> TagNormalizationMemoryStore:
    return SupabaseTagNormalizationMemoryStore()


@router.post("/normalize", response_model=TagNormalizationResponse)
def normalize_profile_tags(
    payload: TagNormalizationRequest,
    _: AuthenticatedUser = Depends(get_current_user),
    provider: TagNormalizationProvider = Depends(get_tag_normalization_provider),
    memory_store: TagNormalizationMemoryStore = Depends(
        get_tag_normalization_memory_store
    ),
) -> TagNormalizationResponse:
    try:
        return TagNormalizationResponse(
            results=normalize_tags(
                tag_type=payload.tag_type,
                raw_tags=payload.raw_tags,
                allow_ai_fallback=payload.allow_ai_fallback,
                provider=provider,
                memory_store=memory_store,
            )
        )
    except TagNormalizationError as exc:
        detail = str(exc)
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if detail == "AI tag normalization is not configured."
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=response_status, detail=detail) from exc
