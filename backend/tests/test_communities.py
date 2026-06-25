from fastapi.testclient import TestClient

from app.auth import AuthenticatedUser
from app.communities.schemas import CommunityCreateResponse
from app.main import app
from app.routers.communities import get_community_repository
from app.routers.communities import get_current_user as get_communities_current_user


class FakeCommunityRepository:
    def __init__(self) -> None:
        self.created_payloads: list[dict] = []

    def create_community(
        self,
        *,
        creator_id: str,
        name: str,
        description: str,
        tags: list[str],
        join_policy: str,
    ) -> CommunityCreateResponse:
        self.created_payloads.append(
            {
                "creator_id": creator_id,
                "name": name,
                "description": description,
                "tags": tags,
                "join_policy": join_policy,
            }
        )

        return CommunityCreateResponse(
            id="community-1",
            creator_id=creator_id,
            name=name,
            description=description,
            tags=tags,
            join_policy=join_policy,
        )


client = TestClient(app)


def override_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(id="user-kaiwen", email="kaiwen@u.nus.edu")


def test_create_community_normalizes_tags_and_trims_text():
    repository = FakeCommunityRepository()

    app.dependency_overrides[get_communities_current_user] = override_current_user
    app.dependency_overrides[get_community_repository] = lambda: repository

    try:
        response = client.post(
            "/v1/communities",
            json={
                "name": "  Product Builders  ",
                "description": "  Build and ship together.  ",
                "privacy": "request_approval",
                "tags": [
                    " product ",
                    "Product",
                    "",
                    "AI",
                    "founders",
                    "design",
                    "research",
                    "extra-tag",
                    "this-tag-is-longer-than-twenty-four-characters",
                ],
            },
        )
    finally:
        app.dependency_overrides.pop(get_communities_current_user, None)
        app.dependency_overrides.pop(get_community_repository, None)

    assert response.status_code == 200
    body = response.json()

    assert body == {
        "id": "community-1",
        "creator_id": "user-kaiwen",
        "name": "Product Builders",
        "description": "Build and ship together.",
        "tags": ["product", "AI", "founders", "design", "research", "extra-tag"],
        "join_policy": "request_approval",
    }
    assert repository.created_payloads == [
        {
            "creator_id": "user-kaiwen",
            "name": "Product Builders",
            "description": "Build and ship together.",
            "tags": ["product", "AI", "founders", "design", "research", "extra-tag"],
            "join_policy": "request_approval",
        }
    ]


def test_create_community_rejects_empty_name_before_repository_call():
    repository = FakeCommunityRepository()

    app.dependency_overrides[get_communities_current_user] = override_current_user
    app.dependency_overrides[get_community_repository] = lambda: repository

    try:
        response = client.post(
            "/v1/communities",
            json={
                "name": "",
                "description": "No name should fail.",
                "privacy": "open",
                "tags": [],
            },
        )
    finally:
        app.dependency_overrides.pop(get_communities_current_user, None)
        app.dependency_overrides.pop(get_community_repository, None)

    assert response.status_code == 422
    assert repository.created_payloads == []
