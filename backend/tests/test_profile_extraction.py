import base64
import io
import json

import pytest
from fastapi.testclient import TestClient

from app import anthropic
from app.auth import AuthenticatedUser
from app.core.config import settings
from app.main import app
from app.profile_extraction import service
from app.profile_extraction.service import (
    ClaudeProfileExtractionProvider,
    ProfileExtractionError,
)
from app.routers.profile_extraction import (
    get_current_user as get_profile_extraction_current_user,
)
from app.routers.profile_extraction import get_profile_extraction_provider


class FakeProfileExtractionProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self, output: dict[str, object]) -> None:
        self.output = output
        self.calls: list[dict[str, str]] = []
        self.health_calls = 0

    def generate(
        self,
        *,
        filename: str,
        mime_type: str,
        file_base64: str,
    ) -> dict[str, object]:
        self.calls.append(
            {
                "filename": filename,
                "mime_type": mime_type,
                "file_base64": file_base64,
            }
        )
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


def valid_output() -> dict[str, object]:
    return {
        "suggested_bio": "  Computing student building useful products.  ",
        "skills": [
            {"value": " Python ", "evidence": "Built APIs with Python"},
            {"value": "python", "evidence": "Repeated skill"},
        ],
        "interests": [{"value": " AI / ML ", "evidence": "ML project"}],
        "cca_tags": [{"value": " NUS Hackers ", "evidence": "Member"}],
        "professional_links": [
            {
                "label": "github",
                "url": "https://github.com/example",
                "evidence": "github.com/example",
            }
        ],
        "entries": [
            {
                "category": "project",
                "title": "  NUSLink  ",
                "organization": None,
                "date_label": "2026",
                "description": "  Built a student matching app.  ",
                "evidence": "NUSLink — student matching app",
            }
        ],
        "warnings": [],
    }


def pdf_payload() -> dict[str, str]:
    return {
        "filename": "resume.pdf",
        "mime_type": "application/pdf",
        "file_base64": base64.b64encode(b"%PDF-1.7 test resume").decode("ascii"),
    }


def test_extract_profile_returns_normalized_reviewable_draft():
    provider = FakeProfileExtractionProvider(valid_output())
    app.dependency_overrides[get_profile_extraction_current_user] = (
        override_current_user
    )
    app.dependency_overrides[get_profile_extraction_provider] = lambda: provider

    try:
        response = client.post("/v1/profiles/extract", json=pdf_payload())
    finally:
        app.dependency_overrides.pop(get_profile_extraction_current_user, None)
        app.dependency_overrides.pop(get_profile_extraction_provider, None)

    assert response.status_code == 200
    body = response.json()
    assert body["suggested_bio"] == "Computing student building useful products."
    assert body["skills"] == [{"value": "Python", "evidence": "Built APIs with Python"}]
    assert body["entries"][0]["title"] == "NUSLink"
    assert body["entries"][0]["description"] == "Built a student matching app."
    assert provider.calls[0]["filename"] == "resume.pdf"


def test_extract_profile_rejects_mismatched_file_signature():
    provider = FakeProfileExtractionProvider(valid_output())
    app.dependency_overrides[get_profile_extraction_current_user] = (
        override_current_user
    )
    app.dependency_overrides[get_profile_extraction_provider] = lambda: provider

    try:
        response = client.post(
            "/v1/profiles/extract",
            json={
                **pdf_payload(),
                "file_base64": base64.b64encode(b"not a PDF").decode("ascii"),
            },
        )
    finally:
        app.dependency_overrides.pop(get_profile_extraction_current_user, None)
        app.dependency_overrides.pop(get_profile_extraction_provider, None)

    assert response.status_code == 400
    assert provider.calls == []


def test_extract_profile_normalizes_sloppy_provider_output():
    provider = FakeProfileExtractionProvider(
        {
            **valid_output(),
            "interests": "not a list",
            "professional_links": [
                {
                    "label": "Github",
                    "url": "github.com/example",
                    "evidence": "github.com/example",
                },
                {"label": "github", "url": "x"},
            ],
            "entries": [
                {
                    "category": "project",
                    "title": "Useful tool",
                    "organization": None,
                    "date_label": None,
                    "description": "Built from resume evidence.",
                    "evidence": "Useful tool",
                },
                {"category": "unknown", "title": "Skipped item"},
            ],
            "warnings": ["  Review imported suggestions before saving.  ", None],
        }
    )
    app.dependency_overrides[get_profile_extraction_current_user] = (
        override_current_user
    )
    app.dependency_overrides[get_profile_extraction_provider] = lambda: provider

    try:
        response = client.post("/v1/profiles/extract", json=pdf_payload())
    finally:
        app.dependency_overrides.pop(get_profile_extraction_current_user, None)
        app.dependency_overrides.pop(get_profile_extraction_provider, None)

    assert response.status_code == 200
    body = response.json()
    assert body["interests"] == []
    assert body["professional_links"] == [
        {
            "label": "github",
            "url": "https://github.com/example",
            "evidence": "github.com/example",
        }
    ]
    assert body["entries"][-1]["title"] == "Useful tool"
    assert body["warnings"] == ["Review imported suggestions before saving."]


def test_extract_profile_requires_authentication():
    response = client.post("/v1/profiles/extract", json=pdf_payload())
    assert response.status_code == 401


def test_claude_provider_sends_private_structured_file_request(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(
        settings,
        "anthropic_profile_extraction_model",
        "test-profile-model",
    )
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeAnthropicResponse(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "emit_profile_extraction",
                        "input": valid_output(),
                    }
                ]
            }
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    result = ClaudeProfileExtractionProvider().generate(
        filename="resume.pdf",
        mime_type="application/pdf",
        file_base64=pdf_payload()["file_base64"],
    )
    api_request = captured_request["request"]
    assert isinstance(api_request, anthropic.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert api_request.full_url == "https://api.anthropic.com/v1/messages"
    assert api_request.get_header("X-api-key") == "test-key"
    assert request_body["model"] == "test-profile-model"
    assert request_body["messages"][0]["content"][0] == {
        "type": "document",
        "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": pdf_payload()["file_base64"],
        },
    }
    response_schema = request_body["tools"][0]["input_schema"]
    assert response_schema["type"] == "object"
    assert response_schema["properties"]["suggested_bio"]["type"] == [
        "string",
        "null",
    ]
    assert request_body["tool_choice"] == {
        "type": "tool",
        "name": "emit_profile_extraction",
    }
    assert captured_request["timeout"] == 45
    assert result["skills"][0]["value"] == " Python "


def test_claude_profile_health_uses_inline_image_request(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(
        settings,
        "anthropic_profile_extraction_model",
        "test-profile-model",
    )
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeAnthropicResponse(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "emit_profile_extraction",
                        "input": valid_output(),
                    }
                ]
            }
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    ClaudeProfileExtractionProvider().check_health()
    api_request = captured_request["request"]
    assert isinstance(api_request, anthropic.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert request_body["messages"][0]["content"][0] == {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": service.PROFILE_HEALTH_IMAGE_BASE64,
        },
    }
    assert captured_request["timeout"] == 45


def test_claude_provider_rejects_tool_refusal(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(
        settings,
        "anthropic_profile_extraction_model",
        "test-profile-model",
    )

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        del api_request, timeout
        return FakeAnthropicResponse({"stop_reason": "refusal", "content": []})

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    with pytest.raises(ProfileExtractionError, match="declined this resume"):
        ClaudeProfileExtractionProvider().generate(
            filename="resume.pdf",
            mime_type="application/pdf",
            file_base64=pdf_payload()["file_base64"],
        )


def test_profile_extraction_provider_surfaces_http_error_detail(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(
        settings,
        "anthropic_profile_extraction_model",
        "test-profile-model",
    )

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        del api_request, timeout
        raise anthropic.error.HTTPError(
            url="https://example.test",
            code=403,
            msg="Forbidden",
            hdrs={},
            fp=io.BytesIO(b'{"error":{"message":"API key not valid"}}'),
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    try:
        ClaudeProfileExtractionProvider().generate(
            filename="resume.pdf",
            mime_type="application/pdf",
            file_base64=pdf_payload()["file_base64"],
        )
    except ProfileExtractionError as exc:
        assert "HTTP 403" in str(exc)
        assert "API key not valid" in str(exc)
    else:
        raise AssertionError("Expected profile extraction HTTP errors to surface.")


def test_profile_extraction_provider_health_endpoint_returns_status():
    provider = FakeProfileExtractionProvider(valid_output())
    app.dependency_overrides[get_profile_extraction_current_user] = (
        override_current_user
    )
    app.dependency_overrides[get_profile_extraction_provider] = lambda: provider

    try:
        response = client.get("/v1/profiles/extract/provider-health")
    finally:
        app.dependency_overrides.pop(get_profile_extraction_current_user, None)
        app.dependency_overrides.pop(get_profile_extraction_provider, None)

    assert response.status_code == 200
    assert response.json() == {
        "provider": "fake",
        "model": "fake-model",
        "configured": bool(settings.anthropic_api_key),
        "ok": True,
        "error": None,
    }
    assert provider.health_calls == 1
