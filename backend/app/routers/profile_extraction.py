from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.profile_extraction.schemas import (
    ProfileExtractionProviderHealthResponse,
    ProfileExtractionRequest,
    ProfileExtractionResponse,
)
from app.profile_extraction.service import (
    ClaudeProfileExtractionProvider,
    InvalidProfileFileError,
    ProfileExtractionError,
    ProfileExtractionProvider,
    create_profile_extraction,
)

router = APIRouter(prefix="/v1/profiles", tags=["profiles"])


def get_profile_extraction_provider() -> ProfileExtractionProvider:
    return ClaudeProfileExtractionProvider()


@router.get(
    "/extract/provider-health",
    response_model=ProfileExtractionProviderHealthResponse,
)
def provider_health(
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: ProfileExtractionProvider = Depends(get_profile_extraction_provider),
) -> ProfileExtractionProviderHealthResponse:
    del current_user
    configured = bool(settings.anthropic_api_key)

    try:
        provider.check_health()
    except ProfileExtractionError as exc:
        return ProfileExtractionProviderHealthResponse(
            provider=provider.provider_name,
            model=provider.model_name,
            configured=configured,
            ok=False,
            error=str(exc),
        )

    return ProfileExtractionProviderHealthResponse(
        provider=provider.provider_name,
        model=provider.model_name,
        configured=configured,
        ok=True,
        error=None,
    )


@router.post("/extract", response_model=ProfileExtractionResponse)
def extract_profile(
    payload: ProfileExtractionRequest,
    _: AuthenticatedUser = Depends(get_current_user),
    provider: ProfileExtractionProvider = Depends(get_profile_extraction_provider),
) -> ProfileExtractionResponse:
    try:
        return create_profile_extraction(payload, provider)
    except InvalidProfileFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ProfileExtractionError as exc:
        detail = str(exc)
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if detail == "AI profile extraction is not configured."
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=response_status, detail=detail) from exc
