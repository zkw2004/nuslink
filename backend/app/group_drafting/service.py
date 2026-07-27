from typing import Protocol

from pydantic import ValidationError

from app.anthropic import AnthropicRequestError, create_message_payload, find_tool_input
from app.core.config import settings
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


class ClaudeGroupDraftProvider:
    provider_name = "claude"

    @property
    def model_name(self) -> str:
        return settings.anthropic_group_drafting_model

    def generate(self, prompt: str) -> dict[str, object]:
        if not settings.anthropic_api_key:
            raise GroupDraftingError("Claude group drafting is not configured.")

        try:
            payload = create_message_payload(
                request_type="group drafting",
                model=settings.anthropic_group_drafting_model,
                api_key=settings.anthropic_api_key,
                body={
                    "model": settings.anthropic_group_drafting_model,
                    "max_tokens": 1200,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {
                            "role": "user",
                            "content": [{"type": "text", "text": prompt}],
                        },
                    ],
                    "tools": [
                        {
                            "name": "emit_group_draft",
                            "description": "Return the group draft fields.",
                            "input_schema": GROUP_DRAFT_SCHEMA,
                        }
                    ],
                    "tool_choice": {"type": "tool", "name": "emit_group_draft"},
                },
                timeout=25,
            )
        except AnthropicRequestError as exc:
            raise GroupDraftingError(str(exc)) from exc

        try:
            return find_tool_input(
                payload,
                request_type="group drafting",
                tool_name="emit_group_draft",
                declined_message="Claude declined this group draft request.",
                no_output_message="Claude returned no group draft.",
            )
        except AnthropicRequestError as exc:
            raise GroupDraftingError(str(exc)) from exc

    def check_health(self) -> None:
        self.generate("CS2040S study group before midterms, 3 to 5 people at COM3.")




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
