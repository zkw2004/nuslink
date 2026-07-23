from dataclasses import replace
from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.main import app
from app.nudges.models import ConnectedModulePeer, NudgeContext, NudgePreferences
from app.nudges.service import build_nudge_notifications
from app.routers.nudges import get_current_user as get_nudges_current_user
from app.routers.nudges import get_nudge_repository


def make_context(
    *,
    active_group_count: int = 0,
    timetable_slot_count: int = 0,
) -> NudgeContext:
    return NudgeContext(
        user_id="user-1",
        profile_created_at=datetime(2026, 1, 1, tzinfo=UTC),
        semester="AY2526S2",
        module_codes=("CS2040S", "CS2103T"),
        active_group_count=active_group_count,
        timetable_slot_count=timetable_slot_count,
        connected_peers=(
            ConnectedModulePeer(
                user_id="user-2",
                display_name="Rachel",
                module_codes=("CS2040S",),
            ),
            ConnectedModulePeer(
                user_id="user-3",
                display_name="Priya",
                module_codes=("CS2040S", "CS3230"),
            ),
        ),
    )


def test_builds_one_nudge_per_enabled_category_with_stable_dedupe_keys():
    notifications = build_nudge_notifications(
        context=make_context(),
        preferences=NudgePreferences(),
        today=date(2026, 3, 2),
    )

    assert [item["type"] for item in notifications] == [
        "nudge_time",
        "nudge_behaviour",
        "nudge_network",
    ]
    assert len({item["dedupe_key"] for item in notifications}) == 3
    assert notifications[1]["metadata"]["reason"] == "no_joined_group"
    assert notifications[2]["metadata"]["connection_count"] == 2


def test_respects_category_controls():
    notifications = build_nudge_notifications(
        context=make_context(),
        preferences=NudgePreferences(
            time_enabled=False,
            behaviour_enabled=False,
            network_enabled=True,
        ),
        today=date(2026, 3, 2),
    )

    assert [item["type"] for item in notifications] == ["nudge_network"]


def test_behaviour_nudge_falls_back_to_missing_timetable_for_new_group_member():
    context = replace(
        make_context(active_group_count=1, timetable_slot_count=0),
        profile_created_at=datetime(2026, 3, 1, tzinfo=UTC),
    )

    notifications = build_nudge_notifications(
        context=context,
        preferences=NudgePreferences(
            time_enabled=False,
            behaviour_enabled=True,
            network_enabled=False,
        ),
        today=date(2026, 3, 2),
    )

    assert len(notifications) == 1
    assert notifications[0]["metadata"]["reason"] == "missing_timetable"


class FakeNudgeRepository:
    def __init__(self, context: NudgeContext | None) -> None:
        self.context = context
        self.created_notifications: list[dict] = []

    def get_preferences(self, *, user_id: str) -> NudgePreferences:
        return NudgePreferences()

    def get_context(self, *, user_id: str, semester: str) -> NudgeContext | None:
        if self.context is None:
            return None
        return replace(
            self.context,
            user_id=user_id,
            semester=semester,
        )

    def create_notifications(self, notifications: list[dict]) -> int:
        self.created_notifications = notifications
        return len(notifications)


client = TestClient(app)


def override_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(id="user-1", email="user@u.nus.edu")


def test_evaluate_endpoint_uses_authenticated_user_and_returns_created_count():
    repository = FakeNudgeRepository(make_context())
    app.dependency_overrides[get_nudges_current_user] = override_current_user
    app.dependency_overrides[get_nudge_repository] = lambda: repository

    try:
        response = client.post("/v1/nudges/evaluate")
    finally:
        app.dependency_overrides.pop(get_nudges_current_user, None)
        app.dependency_overrides.pop(get_nudge_repository, None)

    assert response.status_code == 200
    assert response.json() == {"evaluated": True, "created_count": 3}
    assert all(
        item["recipient_id"] == "user-1" for item in repository.created_notifications
    )


def test_evaluate_endpoint_skips_incomplete_profile():
    repository = FakeNudgeRepository(None)
    app.dependency_overrides[get_nudges_current_user] = override_current_user
    app.dependency_overrides[get_nudge_repository] = lambda: repository

    try:
        response = client.post("/v1/nudges/evaluate")
    finally:
        app.dependency_overrides.pop(get_nudges_current_user, None)
        app.dependency_overrides.pop(get_nudge_repository, None)

    assert response.status_code == 200
    assert response.json() == {"evaluated": False, "created_count": 0}
