import hashlib
import json
from typing import Any, Protocol, cast
from urllib import error, request

from pydantic import BaseModel, Field

from app.core.config import settings
from app.moderation.repository import ModerationRepository
from app.moderation.schemas import (
    ModerationCategory,
    ModerationItem,
    ModerationOutcome,
    ModerationResult,
)

VALID_CATEGORIES: set[str] = {
    "illegal_activity",
    "commercial_spam",
    "harassment",
    "hate_speech",
    "explicit_content",
    "spam_phishing",
    "impersonation",
    "other",
}

SYSTEM_PROMPT = """You moderate NUSLink student app content.
Classify the content as:
- allowed: safe academic/social content.
- flagged: possibly unsafe, ambiguous, or borderline content that should be hidden.
- blocked: clearly unsafe content that should not be posted.

Violation categories are illegal_activity, commercial_spam, harassment,
hate_speech, explicit_content, spam_phishing, impersonation, and other.
Return concise reasons. Do not over-flag normal academic discussion."""


class ModerationProviderError(Exception):
    pass


class ProviderModerationResult(BaseModel):
    outcome: ModerationOutcome
    categories: list[str] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0, le=1)
    reason: str | None = None
    raw_response: dict[str, object] | None = None


class ModerationProvider(Protocol):
    provider_name: str
    model_name: str | None

    def moderate(self, *, subject_type: str, content: str) -> ProviderModerationResult:
        ...


class OpenAIModerationProvider:
    provider_name = "openai"

    @property
    def model_name(self) -> str:
        return settings.openai_moderation_model

    def moderate(self, *, subject_type: str, content: str) -> ProviderModerationResult:
        if not settings.openai_api_key:
            raise ModerationProviderError("AI moderation is not configured.")

        schema = {
            "type": "object",
            "properties": {
                "outcome": {
                    "type": "string",
                    "enum": ["allowed", "flagged", "blocked"],
                },
                "categories": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": list(VALID_CATEGORIES),
                    },
                    "maxItems": 4,
                },
                "confidence": {"type": ["number", "null"], "minimum": 0, "maximum": 1},
                "reason": {"type": ["string", "null"], "maxLength": 240},
            },
            "required": ["outcome", "categories", "confidence", "reason"],
            "additionalProperties": False,
        }

        body = json.dumps(
            {
                "model": settings.openai_moderation_model,
                "input": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "subject_type": subject_type,
                                "content": content,
                            }
                        ),
                    },
                ],
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "nuslink_content_moderation",
                        "strict": True,
                        "schema": schema,
                    }
                },
                "store": False,
            }
        ).encode("utf-8")
        api_request = request.Request(
            "https://api.openai.com/v1/responses",
            data=body,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(api_request, timeout=25) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise ModerationProviderError(
                "The AI provider rejected the moderation request."
            ) from exc
        except (error.URLError, TimeoutError) as exc:
            raise ModerationProviderError(
                "The AI provider is temporarily unavailable."
            ) from exc
        except json.JSONDecodeError as exc:
            raise ModerationProviderError(
                "The AI provider returned an invalid moderation response."
            ) from exc

        output_text = _find_output_text(payload)

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise ModerationProviderError(
                "The AI moderation output was not valid JSON."
            ) from exc

        return _parse_provider_result(parsed, payload)


def moderate_content(
    *,
    actor_id: str,
    item: ModerationItem,
    provider: ModerationProvider,
    repository: ModerationRepository,
) -> ModerationResult:
    cleaned_content = item.content.strip()
    if not cleaned_content:
        return ModerationResult(
            subject_type=item.subject_type,
            subject_id=item.subject_id,
            source_table=item.source_table,
            source_column=item.source_column,
            outcome="allowed",
            categories=[],
            confidence=0,
            reason=None,
            visible=True,
        )

    try:
        provider_result = provider.moderate(
            subject_type=item.subject_type,
            content=cleaned_content,
        )
    except ModerationProviderError as exc:
        provider_result = ProviderModerationResult(
            outcome="error",
            categories=["other"],
            confidence=None,
            reason=str(exc),
            raw_response=None,
        )

    categories = _normalize_categories(provider_result.categories)
    result = ModerationResult(
        subject_type=item.subject_type,
        subject_id=item.subject_id,
        source_table=item.source_table,
        source_column=item.source_column,
        outcome=provider_result.outcome,
        categories=categories,
        confidence=provider_result.confidence,
        reason=_clean_reason(provider_result.reason),
        visible=is_content_visible(provider_result.outcome),
    )

    repository.record_event(
        actor_id=actor_id,
        subject_type=item.subject_type,
        subject_id=item.subject_id,
        source_table=item.source_table,
        source_column=item.source_column,
        content_hash=_content_hash(cleaned_content),
        content_excerpt=_content_excerpt(cleaned_content),
        outcome=result.outcome,
        categories=result.categories,
        confidence=result.confidence,
        reason=result.reason,
        provider=provider.provider_name,
        provider_model=provider.model_name,
        provider_response=provider_result.raw_response,
    )

    return result


def moderate_batch(
    *,
    actor_id: str,
    items: list[ModerationItem],
    provider: ModerationProvider,
    repository: ModerationRepository,
) -> tuple[ModerationOutcome, bool, list[ModerationResult]]:
    results = [
        moderate_content(
            actor_id=actor_id,
            item=item,
            provider=provider,
            repository=repository,
        )
        for item in items
    ]
    overall_outcome = aggregate_outcome([result.outcome for result in results])
    return overall_outcome, is_content_visible(overall_outcome), results


def aggregate_outcome(outcomes: list[ModerationOutcome]) -> ModerationOutcome:
    if "blocked" in outcomes:
        return "blocked"
    if "flagged" in outcomes:
        return "flagged"
    if "error" in outcomes:
        return "error"
    return "allowed"


def is_content_visible(outcome: ModerationOutcome) -> bool:
    return outcome in {"allowed", "error"}


def _find_output_text(payload: dict[str, Any]) -> str:
    for output in payload.get("output", []):
        if not isinstance(output, dict):
            continue
        for content in output.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") == "output_text" and isinstance(
                content.get("text"),
                str,
            ):
                return content["text"]
            if content.get("type") == "refusal":
                raise ModerationProviderError(
                    "The AI provider declined this moderation request."
                )

    raise ModerationProviderError("The AI provider did not return moderation text.")


def _parse_provider_result(
    parsed: dict[str, object],
    raw_response: dict[str, object] | None,
) -> ProviderModerationResult:
    outcome = parsed.get("outcome")
    if outcome not in {"allowed", "flagged", "blocked"}:
        raise ModerationProviderError("The AI moderation outcome was invalid.")

    raw_categories = parsed.get("categories")
    categories = raw_categories if isinstance(raw_categories, list) else []
    confidence = parsed.get("confidence")
    reason = parsed.get("reason")

    return ProviderModerationResult(
        outcome=outcome,
        categories=[
            category if isinstance(category, str) else "other"
            for category in categories
        ],
        confidence=confidence if isinstance(confidence, (int, float)) else None,
        reason=reason if isinstance(reason, str) else None,
        raw_response=raw_response,
    )


def _normalize_categories(categories: list[str]) -> list[ModerationCategory]:
    normalized: list[ModerationCategory] = []
    seen: set[str] = set()

    for category in categories:
        safe_category = category if category in VALID_CATEGORIES else "other"
        if safe_category in seen:
            continue
        seen.add(safe_category)
        normalized.append(cast(ModerationCategory, safe_category))

    return normalized


def _clean_reason(reason: str | None) -> str | None:
    if reason is None:
        return None
    cleaned = reason.strip()
    return cleaned[:240] if cleaned else None


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _content_excerpt(content: str) -> str:
    return content[:240]
