import pytest
from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.main import app
from app.matching.models import ModuleRegistration, ProfileSummary, TimetableSlot
from app.matching.scoring import (
    CandidateScore,
    calculate_interest_overlap_score,
    calculate_overall_score,
    calculate_schedule_overlap_score,
    calculate_study_mode_score,
    calculate_tag_overlap_score,
    normalize_interest_tags,
)
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
                hall_residence="Temasek Hall",
                badge_tier="bronze",
                interests=["AI / ML"],
                cca_tags=["NUS Hackers", "Basketball"],
                skills=["React Native", "Python"],
                intents=["study_group"],
                onboarding_completed=True,
                study_mode="in_person",
                study_style="in_person",
                preferred_group_size=4,
            ),
            "user-2": ProfileSummary(
                id="user-2",
                display_name="Rachel Tan",
                bio="Looking for a CS2040S midterm squad.",
                avatar_url=None,
                faculty="Computing",
                major="Computer Science",
                year_of_study=3,
                hall_residence="Temasek Hall",
                badge_tier="gold",
                interests=["Artificial Intelligence", "Algorithms"],
                cca_tags=["NUS Hackers"],
                skills=["react native", "Algorithms"],
                intents=["study_group"],
                onboarding_completed=True,
                study_mode="in_person",
                study_style="in_person",
                preferred_group_size=4,
            ),
            "user-3": ProfileSummary(
                id="user-3",
                display_name="Priya Ramesh",
                bio="Calm but accountable revision rhythm.",
                avatar_url=None,
                faculty="Computing",
                major="Information Systems",
                year_of_study=3,
                hall_residence="Kent Ridge Hall",
                badge_tier="bronze",
                interests=["Backend"],
                cca_tags=["Debate"],
                skills=["SQL"],
                intents=["study_group"],
                onboarding_completed=True,
                study_mode="online",
                study_style="online",
                preferred_group_size=2,
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
            ModuleRegistration("user-1", "CS2040S"),
            ModuleRegistration("user-1", "CS2030S"),
            ModuleRegistration("user-2", "CS2040S"),
            ModuleRegistration("user-3", "CS2030S"),
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

    def create_high_match_notifications(
        self,
        *,
        user_id: str,
        semester: str,
        candidates: list[dict],
    ) -> None:
        return None


class MissingProfileRepository(FakeMatchRepository):
    def get_profile(self, user_id: str) -> ProfileSummary | None:
        return None


class NoModulesRepository(FakeMatchRepository):
    def list_user_module_registrations(
        self,
        *,
        user_id: str,
        semester: str,
    ) -> list[ModuleRegistration]:
        return []


client = TestClient(app)


def override_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(id="user-1", email="kaiwen@u.nus.edu")


def override_repository() -> FakeMatchRepository:
    return FakeMatchRepository()


@pytest.fixture(autouse=True)
def override_matching_dependencies():
    app.dependency_overrides[get_matches_current_user] = override_current_user
    app.dependency_overrides[get_match_repository] = override_repository

    yield

    app.dependency_overrides.pop(get_matches_current_user, None)
    app.dependency_overrides.pop(get_match_repository, None)


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
    assert body["candidates"][0]["breakdown"]["study_mode"] is not None
    assert body["candidates"][0]["breakdown"]["preferred_group_size"] is not None
    assert body["candidates"][0]["breakdown"]["cca_tag_overlap"] is not None
    assert body["candidates"][0]["hall_residence"] == "Temasek Hall"
    assert "react native" in body["candidates"][0]["skills"]
    assert len(body["candidates"][0]["match_reasons"]) > 0


def test_people_matches_can_scope_to_one_module():
    response = client.get("/v1/matches/people?module_code=CS2030S")

    assert response.status_code == 200
    body = response.json()

    assert len(body["candidates"]) == 1
    assert body["candidates"][0]["user_id"] == "user-3"


def test_people_matches_returns_empty_when_module_filter_is_not_registered():
    response = client.get("/v1/matches/people?module_code=CS9999")

    assert response.status_code == 200
    body = response.json()

    assert body["available_modules"] == ["CS2030S", "CS2040S"]
    assert body["candidates"] == []


def test_people_matches_returns_empty_when_current_user_has_no_modules():
    app.dependency_overrides[get_match_repository] = lambda: NoModulesRepository()

    try:
        response = client.get("/v1/matches/people")
    finally:
        app.dependency_overrides[get_match_repository] = override_repository

    assert response.status_code == 200
    assert response.json()["available_modules"] == []
    assert response.json()["candidates"] == []


def test_people_matches_returns_404_when_profile_is_missing():
    app.dependency_overrides[get_match_repository] = lambda: MissingProfileRepository()

    try:
        response = client.get("/v1/matches/people")
    finally:
        app.dependency_overrides[get_match_repository] = override_repository

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found for the current user."


def test_people_matches_keeps_missing_optional_fields_matchable():
    response = client.get("/v1/matches/people?module_code=CS2030S")

    assert response.status_code == 200
    candidate = response.json()["candidates"][0]

    assert candidate["breakdown"]["schedule_overlap"] == 0
    assert candidate["breakdown"]["module_overlap"] is not None
    assert candidate["breakdown"]["faculty_major"] is not None
    assert candidate["compatibility_percentage"] > 0


def test_people_matches_never_rounds_positive_match_to_zero():
    response = client.get("/v1/matches/people")

    assert response.status_code == 200
    for candidate in response.json()["candidates"]:
        assert candidate["compatibility_percentage"] >= 1


def test_overall_score_redistributes_missing_optional_dimensions():
    score = calculate_overall_score(
        CandidateScore(
            module_overlap=1.0,
            schedule_overlap=None,
            faculty_major=None,
            year_proximity=None,
            interest_overlap=None,
            study_mode=None,
            preferred_group_size=None,
            cca_tag_overlap=None,
            overlap_minutes=0,
        )
    )

    assert score == 100


def test_schedule_overlap_normalizes_against_smaller_availability_total():
    score, overlap_minutes = calculate_schedule_overlap_score(
        [TimetableSlot("user-1", 1, 600, 720)],
        [
            TimetableSlot("user-2", 1, 660, 780),
            TimetableSlot("user-2", 2, 600, 720),
        ],
    )

    assert score == 0.5
    assert overlap_minutes == 60


def test_interest_overlap_handles_case_and_common_aliases():
    score = calculate_interest_overlap_score(
        ["AI / ML", "Backend"],
        ["artificial intelligence", "BACKEND"],
    )

    assert score is not None
    assert round(score, 2) == 0.67


def test_study_mode_flexible_matches_both_modes():
    score = calculate_study_mode_score("flexible", "online")

    assert score == 1.0


def test_cca_tag_overlap_is_case_insensitive():
    score = calculate_tag_overlap_score(
        ["NUS Hackers", "Basketball"],
        ["nus hackers", "BASKETBALL"],
    )

    assert score == 1.0


def test_normalize_interest_tags_supports_broader_canonical_tag_bank():
    normalized = normalize_interest_tags(
        [
            "AI / ML",
            "software eng",
            "Cyber Security",
            "product",
            "PUBLIC POLICY",
            "backend",
        ]
    )

    assert "artificial_intelligence" in normalized
    assert "machine_learning" in normalized
    assert "software_engineering" in normalized
    assert "cybersecurity" in normalized
    assert "product_management" in normalized
    assert "public_policy" in normalized
    assert "backend" in normalized


def test_interest_overlap_handles_multiple_canonical_aliases_together():
    score = calculate_interest_overlap_score(
        ["software engineering", "Cybersecurity", "Product Management"],
        ["SWE", "cyber security", "product"],
    )

    assert score == 1.0


def test_interest_overlap_keeps_unknown_custom_tags_as_exact_matches_only():
    score = calculate_interest_overlap_score(
        ["quant trading", "AI / ML"],
        ["Quant Trading", "machine learning"],
    )

    assert score is not None
    assert round(score, 2) == 0.67
