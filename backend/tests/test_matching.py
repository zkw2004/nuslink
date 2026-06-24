from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.main import app
from app.matching.models import ModuleRegistration, ProfileSummary, TimetableSlot
from app.matching.scoring import calculate_interest_overlap_score
from app.routers.matches import get_current_user as get_matches_current_user
from app.routers.matches import get_match_repository


class FakeMatchRepository:
    def __init__(self) -> None:
        self.current_user_id = "user-1"

    def get_profile(self, user_id: str) -> ProfileSummary | None:
        profiles = {
            "user-1": ProfileSummary(
                id="user-1",
                display_name="Kaiwen Zhang",
                bio="Structured revision and dependable follow-through.",
                avatar_url=None,
                faculty="Computing",
                major="Computer Science",
                year_of_study=2,
                badge_tier="bronze",
                interests=["AI / ML"],
                intents=["study_group"],
                onboarding_completed=True,
            ),
            "user-2": ProfileSummary(
                id="user-2",
                display_name="Rachel Tan",
                bio="Looking for a CS2040S midterm squad.",
                avatar_url=None,
                faculty="Computing",
                major="Computer Science",
                year_of_study=3,
                badge_tier="gold",
                interests=["Artificial Intelligence", "Algorithms"],
                intents=["study_group"],
                onboarding_completed=True,
            ),
            "user-3": ProfileSummary(
                id="user-3",
                display_name="Priya Ramesh",
                bio="Calm but accountable revision rhythm.",
                avatar_url=None,
                faculty="Computing",
                major="Information Systems",
                year_of_study=3,
                badge_tier="bronze",
                interests=["Backend"],
                intents=["study_group"],
                onboarding_completed=True,
            ),
        }
        return profiles.get(user_id)

    def list_profiles(self, user_ids: list[str]) -> list[ProfileSummary]:
        return [
            profile
            for user_id in user_ids
            if (profile := self.get_profile(user_id)) is not None
        ]

    def list_user_module_registrations(
        self,
        *,
        user_id: str,
        semester: str,
    ) -> list[ModuleRegistration]:
        return [
            registration
            for registration in self.list_module_registrations(
                semester=semester,
                module_codes=["CS2040S", "CS2030S"],
            )
            if registration.user_id == user_id
        ]

    def list_module_registrations(
        self,
        *,
        semester: str,
        module_codes: list[str],
        exclude_user_id: str | None = None,
    ) -> list[ModuleRegistration]:
        registrations = [
            ModuleRegistration("user-1", "CS2040S", "A"),
            ModuleRegistration("user-1", "CS2030S", "A-"),
            ModuleRegistration("user-2", "CS2040S", "A-"),
            ModuleRegistration("user-3", "CS2030S", "B+"),
        ]

        filtered = [
            registration
            for registration in registrations
            if not module_codes or registration.module_code in module_codes
        ]

        if exclude_user_id is not None:
            filtered = [
                registration
                for registration in filtered
                if registration.user_id != exclude_user_id
            ]

        return filtered

    def list_timetable_slots(
        self,
        *,
        user_ids: list[str],
        semester: str,
    ) -> list[TimetableSlot]:
        slots = [
            TimetableSlot("user-1", 1, 600, 720),
            TimetableSlot("user-2", 1, 660, 780),
            TimetableSlot("user-3", 2, 600, 660),
        ]
        return [slot for slot in slots if slot.user_id in user_ids]


client = TestClient(app)


def override_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(id="user-1", email="kaiwen@u.nus.edu")


def override_repository() -> FakeMatchRepository:
    return FakeMatchRepository()


app.dependency_overrides[get_matches_current_user] = override_current_user
app.dependency_overrides[get_match_repository] = override_repository


def test_people_matches_returns_ranked_candidates():
    response = client.get("/v1/matches/people")

    assert response.status_code == 200
    body = response.json()

    assert body["available_modules"] == ["CS2030S", "CS2040S"]
    assert len(body["candidates"]) == 2
    assert body["candidates"][0]["user_id"] == "user-2"
    assert (
        body["candidates"][0]["compatibility_percentage"]
        > body["candidates"][1]["compatibility_percentage"]
    )
    assert body["candidates"][0]["shared_modules"] == ["CS2040S"]
    assert body["candidates"][0]["breakdown"]["module_overlap"] is not None
    assert body["candidates"][0]["breakdown"]["faculty_major"] is not None
    assert body["candidates"][0]["breakdown"]["year_proximity"] is not None
    assert body["candidates"][0]["breakdown"]["interest_overlap"] is not None
    assert len(body["candidates"][0]["match_reasons"]) > 0


def test_people_matches_can_scope_to_one_module():
    response = client.get("/v1/matches/people?module_code=CS2030S")

    assert response.status_code == 200
    body = response.json()

    assert len(body["candidates"]) == 1
    assert body["candidates"][0]["user_id"] == "user-3"


def test_people_matches_keeps_missing_optional_fields_matchable():
    response = client.get("/v1/matches/people?module_code=CS2030S")

    assert response.status_code == 200
    candidate = response.json()["candidates"][0]

    assert candidate["breakdown"]["schedule_overlap"] == 0
    assert candidate["breakdown"]["target_grade"] is not None
    assert candidate["compatibility_percentage"] > 0


def test_interest_overlap_handles_case_and_common_aliases():
    score = calculate_interest_overlap_score(
        ["AI / ML", "Backend"],
        ["artificial intelligence", "BACKEND"],
    )

    assert score is not None
    assert round(score, 2) == 0.67
