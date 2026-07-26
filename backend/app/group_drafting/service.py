import json
from typing import Protocol
from urllib import error, request

from pydantic import ValidationError

from app.core.config import settings
from app.group_drafting.schemas import GroupDraftResponse


class GroupDraftingError(Exception):
    pass


class GroupDraftProvider(Protocol):
    def generate(self, prompt: str) -> dict[str, object]: ...


GROUP_DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": ["string", "null"], "maxLength": 50},
        "type": {
            "type": ["string", "null"],
            "enum": [
                "study_group",
                "hackathon_team",
                "project_team",
                "tutoring_session",
                None,
            ],
        },
        "module_code": {"type": ["string", "null"], "maxLength": 12},
        "privacy": {
            "type": ["string", "null"],
            "enum": ["public", "semi_private", "private", None],
        },
        "restriction": {
            "type": ["string", "null"],
            "enum": ["same_module", "same_year", "same_faculty", None],
        },
        "description": {"type": ["string", "null"], "maxLength": 500},
        "venue": {"type": ["string", "null"], "maxLength": 120},
        "min_size": {"type": ["integer", "null"], "minimum": 1, "maximum": 99},
        "max_size": {"type": ["integer", "null"], "minimum": 1, "maximum": 99},
    },
    "required": [
        "name",
        "type",
        "module_code",
        "privacy",
        "restriction",
        "description",
        "venue",
        "min_size",
        "max_size",
    ],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You extract an NUS student group draft from a short description.
Return only facts stated or strongly implied by the user. Use null for missing fields.
Keep the name concise and the description useful. Uppercase module codes.
Choose one valid group type. Default privacy to public when it is not mentioned.
Only set a restriction for semi_private privacy; semi_private must have a restriction.
Do not invent dates, venues, modules, or group sizes."""


class GeminiGroupDraftProvider:
    def generate(self, prompt: str) -> dict[str, object]:
        if not settings.gemini_api_key:
            raise GroupDraftingError("AI group drafting is not configured.")

        body = json.dumps(
            {
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [
                    {"role": "user", "parts": [{"text": prompt}]},
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseJsonSchema": GROUP_DRAFT_SCHEMA,
                },
            }
        ).encode("utf-8")
        api_request = request.Request(
            (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{settings.gemini_model}:generateContent"
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
            raise GroupDraftingError("The AI provider rejected the request.") from exc
        except (error.URLError, TimeoutError) as exc:
            raise GroupDraftingError(
                "The AI provider is temporarily unavailable."
            ) from exc
        except json.JSONDecodeError as exc:
            raise GroupDraftingError(
                "The AI provider returned an invalid response."
            ) from exc

        output_text = _find_output_text(payload)
        try:
            parsed_output = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise GroupDraftingError("The AI draft was not valid JSON.") from exc

        if not isinstance(parsed_output, dict):
            raise GroupDraftingError("The AI draft had an unexpected shape.")

        return parsed_output


def _find_output_text(payload: object) -> str:
    if not isinstance(payload, dict):
        raise GroupDraftingError("The AI provider returned an invalid response.")

    candidates = payload.get("candidates")
    if isinstance(candidates, list):
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            if candidate.get("finishReason") in {"SAFETY", "RECITATION"}:
                raise GroupDraftingError("The AI provider declined this request.")
            content = candidate.get("content")
            if not isinstance(content, dict):
                continue
            parts = content.get("parts")
            if not isinstance(parts, list):
                continue
            for part in parts:
                if not isinstance(part, dict):
                    continue
                text = part.get("text")
                if isinstance(text, str) and text:
                    return text

    raise GroupDraftingError("The AI provider returned no draft.")


def create_group_draft(
    prompt: str,
    provider: GroupDraftProvider,
) -> GroupDraftResponse:
    normalized_prompt = prompt.strip()
    try:
        draft = GroupDraftResponse.model_validate(provider.generate(normalized_prompt))
    except ValidationError as exc:
        raise GroupDraftingError("The AI draft failed validation.") from exc

    return draft.model_copy(
        update={
            "name": draft.name.strip() if draft.name else None,
            "module_code": draft.module_code.strip().upper()
            if draft.module_code
            else None,
            "description": draft.description.strip() if draft.description else None,
            "venue": draft.venue.strip() if draft.venue else None,
        }
    )
