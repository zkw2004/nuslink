import io
import json

import pytest
from fastapi.testclient import TestClient

from app import anthropic
from app.auth import AuthenticatedUser
from app.core.config import settings
from app.group_drafting.service import (
    ClaudeGroupDraftProvider,
    GroupDraftingError,
)
from app.main import app
from app.routers.group_drafts import get_current_user as get_group_drafts_current_user
from app.routers.group_drafts import get_group_draft_provider


class FakeGroupDraftProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self, output: dict[str, object]) -> None:
        self.output = output
        self.prompts: list[str] = []
        self.health_calls = 0

    def generate(self, prompt: str) -> dict[str, object]:
        self.prompts.append(prompt)
        return self.output

    def check_health(self) -> None:
        self.health_calls += 1


class FakeAnthropicResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeAnthropicResponse":
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


def test_claude_provider_sends_structured_messages_request(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_group_drafting_model", "test-model")
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeAnthropicResponse(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "emit_group_draft",
                        "input": {
                            "name": "CS2040S Prep",
                            "type": "study_group",
                            "module_code": "CS2040S",
                            "privacy": "public",
                            "restriction": None,
                            "description": None,
                            "venue": None,
                            "min_size": 3,
                            "max_size": 5,
                        },
                    }
                ]
            }
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    result = ClaudeGroupDraftProvider().generate("Create a CS2040S study group.")
    api_request = captured_request["request"]
    assert isinstance(api_request, anthropic.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert api_request.full_url == "https://api.anthropic.com/v1/messages"
    assert api_request.get_header("X-api-key") == "test-key"
    assert api_request.get_header("Anthropic-version") == "2023-06-01"
    assert captured_request["timeout"] == 25
    assert request_body["model"] == "test-model"
    assert request_body["tool_choice"] == {"type": "tool", "name": "emit_group_draft"}
    response_schema = request_body["tools"][0]["input_schema"]
    assert response_schema["type"] == "object"
    assert response_schema["properties"]["module_code"]["type"] == ["string", "null"]
    assert result["module_code"] == "CS2040S"


def test_group_draft_provider_health_endpoint_returns_status():
    provider = FakeGroupDraftProvider(
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
    )
    app.dependency_overrides[get_group_drafts_current_user] = override_current_user
    app.dependency_overrides[get_group_draft_provider] = lambda: provider

    try:
        response = client.get("/v1/groups/draft/provider-health")
    finally:
        app.dependency_overrides.pop(get_group_drafts_current_user, None)
        app.dependency_overrides.pop(get_group_draft_provider, None)

    assert response.status_code == 200
    assert response.json() == {
        "provider": "fake",
        "model": "fake-model",
        "configured": bool(settings.anthropic_api_key),
        "ok": True,
        "error": None,
    }
    assert provider.health_calls == 1


def test_group_draft_provider_surfaces_http_error_detail(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_group_drafting_model", "test-model")

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        del api_request, timeout
        raise anthropic.error.HTTPError(
            url="https://example.test",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=io.BytesIO(b'{"error":{"message":"quota exceeded"}}'),
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    try:
        ClaudeGroupDraftProvider().generate("Create a CS2040S study group.")
    except GroupDraftingError as exc:
        assert "HTTP 429" in str(exc)
        assert "quota exceeded" in str(exc)
    else:
        raise AssertionError("Expected group draft HTTP errors to surface.")
