import json
from typing import Protocol

from pydantic import ValidationError

from app.core.config import settings
from app.gemini import (
    GeminiRequestError,
    find_output_text,
    generate_content_payload,
    to_gemini_response_schema,
)
from app.group_drafting.schemas import GroupDraftResponse


class GroupDraftingError(Exception):
    pass


class GroupDraftProvider(Protocol):
    provider_name: str
    model_name: str | None

    def generate(self, prompt: str) -> dict[str, object]: ...

    def check_health(self) -> None: ...


GROUP_DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": ["string", "null"]},
        "type": {
            "anyOf": [
                {
                    "type": "string",
                    "enum": [
                        "study_group",
                        "hackathon_team",
                        "project_team",
                        "tutoring_session",
                    ],
                },
                {"type": "null"},
            ],
        },
        "module_code": {"type": ["string", "null"]},
        "privacy": {
            "anyOf": [
                {
                    "type": "string",
                    "enum": ["public", "semi_private", "private"],
                },
                {"type": "null"},
            ],
        },
        "restriction": {
            "anyOf": [
                {
                    "type": "string",
                    "enum": ["same_module", "same_year", "same_faculty"],
                },
                {"type": "null"},
            ],
        },
        "description": {"type": ["string", "null"]},
        "venue": {"type": ["string", "null"]},
        "min_size": {
            "type": ["integer", "null"],
            "minimum": 1,
            "maximum": 99,
        },
        "max_size": {
            "type": ["integer", "null"],
            "minimum": 1,
            "maximum": 99,
        },
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
}

SYSTEM_PROMPT = """You extract an NUS student group draft from a short description.
Return only facts stated or strongly implied by the user. Use null for missing fields.
Keep the name concise and the description useful. Uppercase module codes.
Choose one valid group type. Default privacy to public when it is not mentioned.
Only set a restriction for semi_private privacy; semi_private must have a restriction.
Do not invent dates, venues, modules, or group sizes."""


class GeminiGroupDraftProvider:
    provider_name = "gemini"

    @property
    def model_name(self) -> str:
        return settings.gemini_group_drafting_model

    def generate(self, prompt: str) -> dict[str, object]:
        if not settings.gemini_api_key:
            raise GroupDraftingError("Gemini group drafting is not configured.")

        try:
            payload = generate_content_payload(
                request_type="group drafting",
                model=settings.gemini_group_drafting_model,
                api_key=settings.gemini_api_key,
                body={
                    "systemInstruction": {
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
                        {"role": "user", "parts": [{"text": prompt}]},
                    ],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "responseSchema": to_gemini_response_schema(GROUP_DRAFT_SCHEMA),
                    },
                },
                timeout=25,
            )
        except GeminiRequestError as exc:
            raise GroupDraftingError(str(exc)) from exc

        output_text = _find_gemini_output_text(payload)
        try:
            parsed_output = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise GroupDraftingError("Gemini group draft was not valid JSON.") from exc

        if not isinstance(parsed_output, dict):
            raise GroupDraftingError("The AI draft had an unexpected shape.")

        return parsed_output

    def check_health(self) -> None:
        self.generate("CS2040S study group before midterms, 3 to 5 people at COM3.")


def _find_gemini_output_text(payload: object) -> str:
    try:
        return find_output_text(
            payload,
            request_type="group drafting",
            declined_message="Gemini declined this group draft request.",
            no_output_message="Gemini returned no group draft.",
        )
    except GeminiRequestError as exc:
        raise GroupDraftingError(str(exc)) from exc


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
