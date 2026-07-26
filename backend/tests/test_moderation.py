import json

from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.core.config import settings
from app.main import app
from app.moderation import service
from app.moderation.schemas import ModerationItem
from app.moderation.service import (
    GeminiModerationProvider,
    ModerationProviderError,
    ProviderModerationResult,
    aggregate_outcome,
    moderate_batch,
    moderate_content,
)
from app.routers.moderation import (
    get_current_user as get_moderation_current_user,
)
from app.routers.moderation import (
    get_moderation_provider,
    get_moderation_repository,
)


class FakeModerationProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(
        self,
        results: list[ProviderModerationResult] | None = None,
        error: str | None = None,
    ) -> None:
        self.results = results or [
            ProviderModerationResult(
                outcome="allowed",
                categories=[],
                confidence=0.02,
                reason=None,
            )
        ]
        self.error = error
        self.calls: list[tuple[str, str]] = []

    def moderate(self, *, subject_type: str, content: str) -> ProviderModerationResult:
        self.calls.append((subject_type, content))
        if self.error:
            raise ModerationProviderError(self.error)
        if len(self.calls) <= len(self.results):
            return self.results[len(self.calls) - 1]
        return self.results[-1]


class FakeModerationRepository:
    def __init__(self) -> None:
        self.events: list[dict[str, object]] = []

    def record_event(self, **kwargs: object) -> None:
        self.events.append(kwargs)


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
    return AuthenticatedUser(id="user-kaiwen", email="kaiwen@u.nus.edu")


def moderation_item(content: str, subject_type: str = "group_description"):
    return ModerationItem(
        subject_type=subject_type,
        content=content,
        subject_id="11111111-1111-1111-1111-111111111111",
        source_table="groups",
        source_column="description",
    )


def test_moderate_content_allows_safe_content_and_logs_event():
    provider = FakeModerationProvider()
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("Study CS2040S graphs together"),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "allowed"
    assert result.visible is True
    assert provider.calls == [("group_description", "Study CS2040S graphs together")]
    assert repository.events[0]["outcome"] == "allowed"
    assert repository.events[0]["content_excerpt"] == "Study CS2040S graphs together"
    assert len(str(repository.events[0]["content_hash"])) == 64


def test_moderate_content_blocks_unsafe_content():
    provider = FakeModerationProvider(
        results=[
            ProviderModerationResult(
                outcome="blocked",
                categories=["harassment"],
                confidence=0.91,
                reason="Targets another student.",
            )
        ]
    )
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("clearly unsafe text"),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "blocked"
    assert result.categories == ["harassment"]
    assert result.visible is False
    assert repository.events[0]["outcome"] == "blocked"


def test_moderate_content_blocks_directed_chat_profanity_without_provider():
    provider = FakeModerationProvider()
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item(
            "U fucking idiot",
            subject_type="direct_chat_message",
        ),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "blocked"
    assert result.categories == ["harassment"]
    assert result.visible is False
    assert provider.calls == []
    assert repository.events[0]["provider"] == "rule_based"


def test_moderate_content_flags_borderline_content():
    provider = FakeModerationProvider(
        results=[
            ProviderModerationResult(
                outcome="flagged",
                categories=["commercial_spam"],
                confidence=0.7,
                reason="Looks like unrelated promotion.",
            )
        ]
    )
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("borderline promotion"),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "flagged"
    assert result.visible is False
    assert repository.events[0]["categories"] == ["commercial_spam"]


def test_provider_failure_returns_error_and_keeps_content_visible():
    provider = FakeModerationProvider(error="The AI provider is down.")
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("Normal group text"),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "error"
    assert result.visible is True
    assert result.categories == ["other"]
    assert result.reason == "The AI provider is down."
    assert repository.events[0]["outcome"] == "error"


def test_empty_content_is_allowed_without_provider_or_log_call():
    provider = FakeModerationProvider()
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("     "),
        provider=provider,
        repository=repository,
    )

    assert result.outcome == "allowed"
    assert result.visible is True
    assert provider.calls == []
    assert repository.events == []


def test_invalid_provider_category_is_normalized_to_other():
    provider = FakeModerationProvider(
        results=[
            ProviderModerationResult(
                outcome="flagged",
                categories=["made_up_category"],
                confidence=0.55,
                reason="Unknown category from provider.",
            )
        ]
    )
    repository = FakeModerationRepository()

    result = moderate_content(
        actor_id="user-kaiwen",
        item=moderation_item("Borderline text"),
        provider=provider,
        repository=repository,
    )

    assert result.categories == ["other"]


def test_batch_aggregate_prioritizes_blocked_then_flagged_then_error():
    assert aggregate_outcome(["allowed", "error"]) == "error"
    assert aggregate_outcome(["allowed", "error", "flagged"]) == "flagged"
    assert aggregate_outcome(["allowed", "flagged", "blocked"]) == "blocked"


def test_moderate_batch_returns_aggregate_visibility():
    provider = FakeModerationProvider(
        results=[
            ProviderModerationResult(
                outcome="allowed",
                categories=[],
                confidence=0.01,
                reason=None,
            ),
            ProviderModerationResult(
                outcome="flagged",
                categories=["other"],
                confidence=0.6,
                reason="Ambiguous.",
            ),
        ]
    )
    repository = FakeModerationRepository()

    overall_outcome, visible, results = moderate_batch(
        actor_id="user-kaiwen",
        items=[
            moderation_item("CS2040S study group", "group_name"),
            moderation_item("ambiguous text", "group_description"),
        ],
        provider=provider,
        repository=repository,
    )

    assert overall_outcome == "flagged"
    assert visible is False
    assert [result.outcome for result in results] == ["allowed", "flagged"]
    assert len(repository.events) == 2


def test_check_endpoint_returns_structured_result():
    provider = FakeModerationProvider()
    repository = FakeModerationRepository()
    app.dependency_overrides[get_moderation_current_user] = override_current_user
    app.dependency_overrides[get_moderation_provider] = lambda: provider
    app.dependency_overrides[get_moderation_repository] = lambda: repository

    try:
        response = client.post(
            "/v1/moderation/check",
            json={
                "subject_type": "profile_bio",
                "content": "I like building useful apps.",
                "source_table": "profiles",
                "source_column": "bio",
            },
        )
    finally:
        app.dependency_overrides.pop(get_moderation_current_user, None)
        app.dependency_overrides.pop(get_moderation_provider, None)
        app.dependency_overrides.pop(get_moderation_repository, None)

    assert response.status_code == 200
    assert response.json()["outcome"] == "allowed"
    assert response.json()["visible"] is True
    assert len(repository.events) == 1


def test_batch_endpoint_returns_overall_outcome():
    provider = FakeModerationProvider(
        results=[
            ProviderModerationResult(
                outcome="allowed",
                categories=[],
                confidence=0.01,
                reason=None,
            ),
            ProviderModerationResult(
                outcome="blocked",
                categories=["spam_phishing"],
                confidence=0.96,
                reason="Phishing attempt.",
            ),
        ]
    )
    repository = FakeModerationRepository()
    app.dependency_overrides[get_moderation_current_user] = override_current_user
    app.dependency_overrides[get_moderation_provider] = lambda: provider
    app.dependency_overrides[get_moderation_repository] = lambda: repository

    try:
        response = client.post(
            "/v1/moderation/check-batch",
            json={
                "items": [
                    {
                        "subject_type": "group_name",
                        "content": "CS2040S Prep",
                    },
                    {
                        "subject_type": "group_description",
                        "content": "unsafe",
                    },
                ]
            },
        )
    finally:
        app.dependency_overrides.pop(get_moderation_current_user, None)
        app.dependency_overrides.pop(get_moderation_provider, None)
        app.dependency_overrides.pop(get_moderation_repository, None)

    assert response.status_code == 200
    body = response.json()
    assert body["overall_outcome"] == "blocked"
    assert body["visible"] is False
    assert [result["outcome"] for result in body["results"]] == [
        "allowed",
        "blocked",
    ]


def test_moderation_endpoint_requires_authentication():
    response = client.post(
        "/v1/moderation/check",
        json={"subject_type": "profile_bio", "content": "hello"},
    )

    assert response.status_code == 401


def test_gemini_provider_sends_structured_generate_content_request(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_moderation_model", "test-model")
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
                                            "outcome": "allowed",
                                            "categories": [],
                                            "confidence": 0.01,
                                            "reason": None,
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(service.request, "urlopen", fake_urlopen)

    result = GeminiModerationProvider().moderate(
        subject_type="group_description",
        content="Study dynamic programming together.",
    )
    api_request = captured_request["request"]
    assert isinstance(api_request, service.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert (
        api_request.full_url
        == "https://generativelanguage.googleapis.com/v1beta/models/"
        "test-model:generateContent"
    )
    assert api_request.get_header("X-goog-api-key") == "test-key"
    assert captured_request["timeout"] == 25
    assert request_body["generationConfig"]["responseMimeType"] == (
        "application/json"
    )
    assert request_body["generationConfig"]["responseSchema"]["type"] == "object"
    assert request_body["generationConfig"]["responseSchema"]["properties"][
        "confidence"
    ]["nullable"] is True
    assert request_body["generationConfig"]["responseSchema"]["properties"][
        "reason"
    ]["nullable"] is True
    assert "temperature" not in request_body["generationConfig"]
    assert result.outcome == "allowed"
