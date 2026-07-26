import hashlib
import json
import re
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

CHAT_SUBJECT_TYPES = {
    "direct_chat_message",
    "group_chat_message",
    "community_chat_message",
}
ABUSIVE_PROFANITY_PATTERN = re.compile(
    r"\b(f+u+c+k+(?:ing|er|ed)?|f+ck(?:ing|er|ed)?|shit+|bitch+|cunt+)\b",
    re.IGNORECASE,
)
DIRECTED_ATTACK_PATTERN = re.compile(
    r"\b(u|you|ur|your|idiot|moron|stupid|dumb|loser)\b",
    re.IGNORECASE,
)


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


class GeminiModerationProvider:
    provider_name = "gemini"

    @property
    def model_name(self) -> str:
        return settings.gemini_moderation_model

    def moderate(self, *, subject_type: str, content: str) -> ProviderModerationResult:
        if not settings.gemini_api_key:
            raise ModerationProviderError("Gemini moderation is not configured.")

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
        }

        body = json.dumps(
            {
                "system_instruction": {
                    "parts": [
                        {
                            "text": (
                                f"{SYSTEM_PROMPT}\n"
                                "Return only JSON matching the response schema."
                            )
                        }
                    ]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": json.dumps(
                                    {
                                        "subject_type": subject_type,
                                        "content": content,
                                    }
                                )
                            }
                        ],
                    }
                ],
                "generation_config": {
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                    "temperature": 0,
                },
            }
        ).encode("utf-8")
        api_request = request.Request(
            (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{settings.gemini_moderation_model}:generateContent"
            ),
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.gemini_api_key,
            },
            method="POST",
        )

        try:
            with request.urlopen(api_request, timeout=25) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise ModerationProviderError(
                "Gemini rejected the moderation request."
            ) from exc
        except (error.URLError, TimeoutError) as exc:
            raise ModerationProviderError(
                "Gemini is temporarily unavailable."
            ) from exc
        except json.JSONDecodeError as exc:
            raise ModerationProviderError(
                "Gemini returned an invalid moderation response."
            ) from exc

        output_text = _find_gemini_output_text(payload)

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise ModerationProviderError(
                "Gemini moderation output was not valid JSON."
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

    rule_based_result = _rule_based_chat_result(cleaned_content, item)
    if rule_based_result:
        repository.record_event(
            actor_id=actor_id,
            subject_type=item.subject_type,
            subject_id=item.subject_id,
            source_table=item.source_table,
            source_column=item.source_column,
            content_hash=_content_hash(cleaned_content),
            content_excerpt=_content_excerpt(cleaned_content),
            outcome=rule_based_result.outcome,
            categories=rule_based_result.categories,
            confidence=rule_based_result.confidence,
            reason=rule_based_result.reason,
            provider="rule_based",
            provider_model=None,
            provider_response={"rule": "abusive_chat_profanity"},
        )
        return rule_based_result

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


def _rule_based_chat_result(
    content: str,
    item: ModerationItem,
) -> ModerationResult | None:
    if item.subject_type not in CHAT_SUBJECT_TYPES:
        return None

    has_abusive_profanity = ABUSIVE_PROFANITY_PATTERN.search(content) is not None
    is_directed_attack = DIRECTED_ATTACK_PATTERN.search(content) is not None

    if not has_abusive_profanity or not is_directed_attack:
        return None

    return ModerationResult(
        subject_type=item.subject_type,
        subject_id=item.subject_id,
        source_table=item.source_table,
        source_column=item.source_column,
        outcome="blocked",
        categories=["harassment"],
        confidence=0.98,
        reason="Targets another user with abusive profanity.",
        visible=False,
    )


def _find_gemini_output_text(payload: dict[str, Any]) -> str:
    for candidate in payload.get("candidates", []):
        if not isinstance(candidate, dict):
            continue

        finish_reason = candidate.get("finishReason")
        if finish_reason in {"SAFETY", "RECITATION"}:
            raise ModerationProviderError(
                "Gemini declined this moderation request."
            )

        content = candidate.get("content")
        if not isinstance(content, dict):
            continue

        for part in content.get("parts", []):
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str):
                return text

    raise ModerationProviderError("Gemini did not return moderation text.")


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
