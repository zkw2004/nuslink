import json

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.core.config import settings
from app.group_drafting import service
from app.group_drafting.service import (
    GeminiGroupDraftProvider,
    GroupDraftingError,
    _find_gemini_output_text,
)
from app.main import app
from app.routers.group_drafts import get_current_user as get_group_drafts_current_user
from app.routers.group_drafts import get_group_draft_provider


class FakeGroupDraftProvider:
    def __init__(self, output: dict[str, object]) -> None:
        self.output = output
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> dict[str, object]:
        self.prompts.append(prompt)
        return self.output


class FakeGeminiResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeGeminiResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


client = TestClient(app)


def override_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(id="user-joel", email="joel@u.nus.edu")


def test_draft_group_returns_normalized_reviewable_fields():
    provider = FakeGroupDraftProvider(
        {
            "name": "  CS2040S Midterm Prep  ",
            "type": "study_group",
            "module_code": " cs2040s ",
            "privacy": "public",
            "restriction": None,
            "description": "  Revise graph algorithms together.  ",
            "venue": "  COM3  ",
            "min_size": 3,
            "max_size": 5,
        }
    )
    app.dependency_overrides[get_group_drafts_current_user] = override_current_user
    app.dependency_overrides[get_group_draft_provider] = lambda: provider

    try:
        response = client.post(
            "/v1/groups/draft",
            json={"prompt": "  CS2040S midterm group, 3 to 5 people at COM3.  "},
        )
    finally:
        app.dependency_overrides.pop(get_group_drafts_current_user, None)
        app.dependency_overrides.pop(get_group_draft_provider, None)

    assert response.status_code == 200
    assert response.json() == {
        "name": "CS2040S Midterm Prep",
        "type": "study_group",
        "module_code": "CS2040S",
        "privacy": "public",
        "restriction": None,
        "description": "Revise graph algorithms together.",
        "venue": "COM3",
        "min_size": 3,
        "max_size": 5,
    }
    assert provider.prompts == ["CS2040S midterm group, 3 to 5 people at COM3."]


def test_draft_group_rejects_invalid_provider_output():
    provider = FakeGroupDraftProvider(
        {
            "name": "Invalid sizes",
            "type": "study_group",
            "module_code": "CS2040S",
            "privacy": "public",
            "restriction": None,
            "description": None,
            "venue": None,
            "min_size": 8,
            "max_size": 3,
        }
    )
    app.dependency_overrides[get_group_drafts_current_user] = override_current_user
    app.dependency_overrides[get_group_draft_provider] = lambda: provider

    try:
        response = client.post(
            "/v1/groups/draft",
            json={"prompt": "Create a CS2040S group with inconsistent sizes."},
        )
    finally:
        app.dependency_overrides.pop(get_group_drafts_current_user, None)
        app.dependency_overrides.pop(get_group_draft_provider, None)

    assert response.status_code == 502
    assert response.json() == {"detail": "The AI draft failed validation."}


def test_draft_group_requires_authentication():
    response = client.post(
        "/v1/groups/draft",
        json={"prompt": "Create a public CS2040S study group."},
    )

    assert response.status_code == 401


def test_draft_group_rejects_whitespace_only_prompt_before_provider_call():
    provider = FakeGroupDraftProvider({})
    app.dependency_overrides[get_group_drafts_current_user] = override_current_user
    app.dependency_overrides[get_group_draft_provider] = lambda: provider

    try:
        response = client.post(
            "/v1/groups/draft",
            json={"prompt": "            "},
        )
    finally:
        app.dependency_overrides.pop(get_group_drafts_current_user, None)
        app.dependency_overrides.pop(get_group_draft_provider, None)

    assert response.status_code == 422
    assert provider.prompts == []


def test_find_gemini_output_text_reads_candidate_content():
    output_text = _find_gemini_output_text(
        {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": '{"name":"Draft"}'}],
                    },
                }
            ]
        }
    )

    assert output_text == '{"name":"Draft"}'


def test_find_gemini_output_text_rejects_safety_block():
    try:
        _find_gemini_output_text(
            {
                "candidates": [{"finishReason": "SAFETY"}],
            }
        )
    except GroupDraftingError as exc:
        assert str(exc) == "Gemini declined this group draft request."
    else:
        raise AssertionError("Expected a provider refusal to raise an error.")


def test_gemini_provider_sends_structured_generate_content_request(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_group_drafting_model", "test-model")
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeGeminiResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeGeminiResponse(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "name": "CS2040S Prep",
                                            "type": "study_group",
                                            "module_code": "CS2040S",
                                            "privacy": "public",
                                            "restriction": None,
                                            "description": None,
                                            "venue": None,
                                            "min_size": 3,
                                            "max_size": 5,
                                        }
                                    ),
                                }
                            ],
                        },
                    }
                ]
            }
        )

    monkeypatch.setattr(service.request, "urlopen", fake_urlopen)

    result = GeminiGroupDraftProvider().generate("Create a CS2040S study group.")
    api_request = captured_request["request"]
    assert isinstance(api_request, service.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert api_request.full_url == (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "test-model:generateContent"
    )
    assert api_request.get_header("X-goog-api-key") == "test-key"
    assert captured_request["timeout"] == 25
    assert request_body["generationConfig"]["responseMimeType"] == (
        "application/json"
    )
    response_schema = request_body["generationConfig"]["responseJsonSchema"]
    assert response_schema["type"] == "object"
    assert "nullable" not in json.dumps(response_schema)
    assert "maxLength" not in json.dumps(response_schema)
    assert result["module_code"] == "CS2040S"
