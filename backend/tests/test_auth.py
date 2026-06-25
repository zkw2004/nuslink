import json
from io import BytesIO
from urllib import error

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app import auth
from app.core.config import settings


class FakeSupabaseResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeSupabaseResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def test_get_current_user_requires_bearer_token():
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing bearer token."


def test_get_current_user_rejects_non_bearer_scheme():
    credentials = HTTPAuthorizationCredentials(
        scheme="Basic",
        credentials="token",
    )

    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(credentials)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing bearer token."


def test_fetch_supabase_user_returns_authenticated_user(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-key")

    def fake_urlopen(request: object, timeout: int) -> FakeSupabaseResponse:
        return FakeSupabaseResponse(
            {
                "id": "user-123",
                "email": "kaiwen@u.nus.edu",
            }
        )

    monkeypatch.setattr(auth.request, "urlopen", fake_urlopen)

    user = auth._fetch_supabase_user("access-token")

    assert user.id == "user-123"
    assert user.email == "kaiwen@u.nus.edu"


def test_fetch_supabase_user_maps_supabase_unauthorized(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_key", "service-key")

    def fake_urlopen(request: object, timeout: int) -> FakeSupabaseResponse:
        raise error.HTTPError(
            url="https://example.supabase.co/auth/v1/user",
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=BytesIO(),
        )

    monkeypatch.setattr(auth.request, "urlopen", fake_urlopen)

    with pytest.raises(HTTPException) as exc:
        auth._fetch_supabase_user("expired-token")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or expired access token."


def test_fetch_supabase_user_fails_when_backend_auth_is_not_configured(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(settings, "supabase_url", "")
    monkeypatch.setattr(settings, "supabase_service_key", "")

    with pytest.raises(HTTPException) as exc:
        auth._fetch_supabase_user("access-token")

    assert exc.value.status_code == 503
    assert exc.value.detail == "Supabase auth is not configured for the backend."
