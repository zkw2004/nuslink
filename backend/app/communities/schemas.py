from typing import Literal

from pydantic import BaseModel, Field


class CreateCommunityRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=500)
    tags: list[str] = Field(default_factory=list)
    privacy: Literal["open", "request_approval"] = "open"


class CommunityCreateResponse(BaseModel):
    id: str
    name: str
    description: str
    tags: list[str]
    join_policy: Literal["open", "request_approval"]
    creator_id: str
