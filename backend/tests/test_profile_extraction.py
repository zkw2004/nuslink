import base64
import json

import pytest
from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.core.config import settings
from app.main import app
from app.profile_extraction import service
from app.profile_extraction.service import (
    OpenAIProfileExtractionProvider,
    ProfileExtractionError,
    _find_output_text,
)
from app.routers.profile_extraction import (
    get_current_user as get_profile_extraction_current_user,
)
from app.routers.profile_extraction import get_profile_extraction_provider


class FakeProfileExtractionProvider:
    def __init__(self, output: dict[str, object]) -> None:
        self.output = output
        self.calls: list[dict[str, str]] = []

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


class FakeOpenAIResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeOpenAIResponse":
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
    assert body["skills"] == [
        {"value": "Python", "evidence": "Built APIs with Python"}
    ]
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


def test_extract_profile_rejects_invalid_provider_output():
    provider = FakeProfileExtractionProvider(
        {**valid_output(), "professional_links": [{"label": "github", "url": "x"}]}
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

    assert response.status_code == 502
    assert response.json() == {
        "detail": "The extracted profile failed validation."
    }


def test_extract_profile_requires_authentication():
    response = client.post("/v1/profiles/extract", json=pdf_payload())
    assert response.status_code == 401


def test_find_output_text_rejects_provider_refusal():
    with pytest.raises(
        ProfileExtractionError,
        match="The AI provider declined this resume.",
    ):
        _find_output_text(
            {
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "refusal", "refusal": "No"}],
                    }
                ]
            }
        )


def test_openai_provider_sends_private_structured_file_request(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(
        settings,
        "openai_profile_extraction_model",
        "test-profile-model",
    )
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeOpenAIResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeOpenAIResponse(
            {
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps(valid_output()),
                            }
                        ],
                    }
                ]
            }
        )

    monkeypatch.setattr(service.request, "urlopen", fake_urlopen)

    result = OpenAIProfileExtractionProvider().generate(
        filename="resume.pdf",
        mime_type="application/pdf",
        file_base64=pdf_payload()["file_base64"],
    )
    api_request = captured_request["request"]
    assert isinstance(api_request, service.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert api_request.full_url == "https://api.openai.com/v1/responses"
    assert request_body["model"] == "test-profile-model"
    assert request_body["store"] is False
    assert request_body["input"][1]["content"][0]["type"] == "input_file"
    assert request_body["text"]["format"]["type"] == "json_schema"
    assert request_body["text"]["format"]["strict"] is True
    assert captured_request["timeout"] == 45
    assert result["skills"][0]["value"] == " Python "
