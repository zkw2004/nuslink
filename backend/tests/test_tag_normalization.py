import json

from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app import anthropic
from app.core.config import settings
from app.main import app
from app.routers.tags import (
    get_current_user as get_tags_current_user,
)
from app.routers.tags import (
    get_tag_normalization_memory_store,
    get_tag_normalization_provider,
)
from app.tag_normalization import service
from app.tag_normalization.schemas import TagClassification
from app.tag_normalization.service import (
    ClaudeTagNormalizationProvider,
    TagNormalizationError,
    normalize_interest_tags_for_matching,
    normalize_tags,
)


class FakeTagNormalizationProvider:
    def __init__(
        self,
        output: TagClassification | None = None,
        error: str | None = None,
    ) -> None:
        self.output = output or TagClassification(canonical_tags=[], no_match=True)
        self.error = error
        self.calls: list[tuple[str, str]] = []

    def classify(self, *, tag_type: str, raw_tag: str) -> TagClassification:
        self.calls.append((tag_type, raw_tag))
        if self.error:
            raise TagNormalizationError(self.error)
        return self.output


class FakeTagNormalizationMemoryStore:
    def __init__(self) -> None:
        self.entries: dict[tuple[str, str], dict[str, object]] = {}
        self.remembered: list[tuple[str, str, str]] = []

    def lookup(
        self,
        *,
        tag_type: str,
        normalized_raw_tag: str,
    ):
        entry = self.entries.get((tag_type, normalized_raw_tag))
        if entry is None:
            return None

        return service.TagNormalizationResult(**entry)

    def remember_passthrough(
        self,
        *,
        tag_type: str,
        raw_tag: str,
        normalized_raw_tag: str,
    ) -> None:
        self.remembered.append((tag_type, raw_tag, normalized_raw_tag))
        self.entries[(tag_type, normalized_raw_tag)] = {
            "raw_tag": raw_tag,
            "normalized_raw_tag": normalized_raw_tag,
            "canonical_tags": [],
            "source": "passthrough",
            "matched": False,
        }


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
    return AuthenticatedUser(id="user-kaiwen", email="kaiwen@u.nus.edu")


def test_normalize_tags_uses_rule_match_before_ai():
    provider = FakeTagNormalizationProvider(
        output=TagClassification(canonical_tags=["Case Competitions"], no_match=False)
    )
    memory_store = FakeTagNormalizationMemoryStore()

    results = normalize_tags(
        tag_type="interest",
        raw_tags=["AI / ML"],
        allow_ai_fallback=True,
        provider=provider,
        memory_store=memory_store,
    )

    assert [result.model_dump() for result in results] == [
        {
            "raw_tag": "AI / ML",
            "normalized_raw_tag": "ai / ml",
            "canonical_tags": ["AI / ML"],
            "source": "rule",
            "matched": True,
        }
    ]
    assert provider.calls == []


def test_normalize_tags_uses_ai_when_rules_do_not_resolve_tag():
    provider = FakeTagNormalizationProvider(
        output=TagClassification(canonical_tags=["Case Competitions"], no_match=False)
    )
    memory_store = FakeTagNormalizationMemoryStore()

    results = normalize_tags(
        tag_type="cca",
        raw_tags=["biz case comps"],
        allow_ai_fallback=True,
        provider=provider,
        memory_store=memory_store,
    )

    assert [result.model_dump() for result in results] == [
        {
            "raw_tag": "biz case comps",
            "normalized_raw_tag": "biz case comps",
            "canonical_tags": ["Case Competitions"],
            "source": "ai",
            "matched": True,
        }
    ]
    assert provider.calls == [("cca", "biz case comps")]


def test_normalize_tags_keeps_passthrough_when_ai_returns_no_match():
    provider = FakeTagNormalizationProvider()
    memory_store = FakeTagNormalizationMemoryStore()

    results = normalize_tags(
        tag_type="project",
        raw_tags=["cardiopulmonary surgery"],
        allow_ai_fallback=True,
        provider=provider,
        memory_store=memory_store,
    )

    assert [result.model_dump() for result in results] == [
        {
            "raw_tag": "cardiopulmonary surgery",
            "normalized_raw_tag": "cardiopulmonary surgery",
            "canonical_tags": [],
            "source": "passthrough",
            "matched": False,
        }
    ]
    assert memory_store.remembered == [
        ("project", "cardiopulmonary surgery", "cardiopulmonary surgery")
    ]


def test_normalize_tags_falls_back_to_passthrough_when_ai_is_unconfigured():
    provider = FakeTagNormalizationProvider(
        error="AI tag normalization is not configured."
    )
    memory_store = FakeTagNormalizationMemoryStore()

    results = normalize_tags(
        tag_type="project",
        raw_tags=["cardiopulmonary surgery"],
        allow_ai_fallback=True,
        provider=provider,
        memory_store=memory_store,
    )

    assert results[0].source == "passthrough"
    assert results[0].matched is False


def test_normalize_tags_reuses_remembered_passthrough_before_ai():
    provider = FakeTagNormalizationProvider(
        output=TagClassification(canonical_tags=["HealthTech"], no_match=False)
    )
    memory_store = FakeTagNormalizationMemoryStore()
    memory_store.entries[("project", "cardiopulmonary surgery")] = {
        "raw_tag": "cardiopulmonary surgery",
        "normalized_raw_tag": "cardiopulmonary surgery",
        "canonical_tags": [],
        "source": "passthrough",
        "matched": False,
    }

    results = normalize_tags(
        tag_type="project",
        raw_tags=["cardiopulmonary surgery"],
        allow_ai_fallback=True,
        provider=provider,
        memory_store=memory_store,
    )

    assert [result.model_dump() for result in results] == [
        {
            "raw_tag": "cardiopulmonary surgery",
            "normalized_raw_tag": "cardiopulmonary surgery",
            "canonical_tags": [],
            "source": "passthrough",
            "matched": False,
        }
    ]
    assert provider.calls == []


def test_normalize_interest_tags_for_matching_preserves_existing_alias_overlap():
    normalized = normalize_interest_tags_for_matching(
        ["AI / ML", "software eng", "product", "PUBLIC POLICY"]
    )

    assert "artificial_intelligence" in normalized
    assert "machine_learning" in normalized
    assert "software_engineering" in normalized
    assert "product_management" in normalized
    assert "public_policy" in normalized


def test_normalize_tags_endpoint_requires_authentication():
    response = client.post(
        "/v1/tags/normalize",
        json={"tag_type": "interest", "raw_tags": ["AI / ML"]},
    )

    assert response.status_code == 401


def test_normalize_tags_endpoint_returns_structured_results():
    provider = FakeTagNormalizationProvider(
        output=TagClassification(canonical_tags=["Case Competitions"], no_match=False)
    )
    memory_store = FakeTagNormalizationMemoryStore()
    app.dependency_overrides[get_tags_current_user] = override_current_user
    app.dependency_overrides[get_tag_normalization_provider] = lambda: provider
    app.dependency_overrides[get_tag_normalization_memory_store] = lambda: memory_store

    try:
        response = client.post(
            "/v1/tags/normalize",
            json={"tag_type": "cca", "raw_tags": ["biz case comps"]},
        )
    finally:
        app.dependency_overrides.pop(get_tags_current_user, None)
        app.dependency_overrides.pop(get_tag_normalization_provider, None)
        app.dependency_overrides.pop(get_tag_normalization_memory_store, None)

    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "raw_tag": "biz case comps",
                "normalized_raw_tag": "biz case comps",
                "canonical_tags": ["Case Competitions"],
                "source": "ai",
                "matched": True,
            }
        ]
    }


def test_claude_provider_sends_supported_canonical_schema(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_model", "test-model")
    captured_request: dict[str, object] = {}

    def fake_urlopen(api_request: object, timeout: int) -> FakeAnthropicResponse:
        captured_request["request"] = api_request
        captured_request["timeout"] = timeout
        return FakeAnthropicResponse(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "emit_tag_classification",
                        "input": {
                            "canonical_tags": ["Case Competitions"],
                            "no_match": False,
                        },
                    }
                ]
            }
        )

    monkeypatch.setattr(anthropic.request, "urlopen", fake_urlopen)

    result = ClaudeTagNormalizationProvider().classify(
        tag_type="cca",
        raw_tag="biz case comps",
    )
    api_request = captured_request["request"]
    assert isinstance(api_request, anthropic.request.Request)
    request_body = json.loads(api_request.data.decode("utf-8"))

    assert api_request.full_url == "https://api.anthropic.com/v1/messages"
    assert api_request.get_header("X-api-key") == "test-key"
    assert captured_request["timeout"] == 25
    assert request_body["tool_choice"] == {
        "type": "tool",
        "name": "emit_tag_classification",
    }
    response_schema = request_body["tools"][0]["input_schema"]
    assert "Case Competitions" in json.dumps(response_schema)
    assert response_schema["additionalProperties"] is False
    assert result == TagClassification(
        canonical_tags=["Case Competitions"],
        no_match=False,
    )
