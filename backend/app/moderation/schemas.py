from typing import Literal

from pydantic import BaseModel, Field

ModerationSubjectType = Literal[
    "profile_bio",
    "group_name",
    "group_description",
    "group_tag",
    "community_name",
    "community_description",
    "community_tag",
    "direct_chat_message",
    "group_chat_message",
    "community_chat_message",
]

ModerationOutcome = Literal["allowed", "flagged", "blocked", "error"]

ModerationCategory = Literal[
    "illegal_activity",
    "commercial_spam",
    "harassment",
    "hate_speech",
    "explicit_content",
    "spam_phishing",
    "impersonation",
    "other",
]


class ModerationItem(BaseModel):
    subject_type: ModerationSubjectType
    content: str = Field(default="", max_length=4000)
    subject_id: str | None = None
    source_table: str | None = Field(default=None, max_length=64)
    source_column: str | None = Field(default=None, max_length=64)


class ModerationCheckRequest(ModerationItem):
    pass


class ModerationBatchRequest(BaseModel):
    items: list[ModerationItem] = Field(min_length=1, max_length=24)


class ModerationResult(BaseModel):
    subject_type: ModerationSubjectType
    subject_id: str | None = None
    source_table: str | None = None
    source_column: str | None = None
    outcome: ModerationOutcome
    categories: list[ModerationCategory] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0, le=1)
    reason: str | None = None
    visible: bool


class ModerationCheckResponse(ModerationResult):
    pass


class ModerationBatchResponse(BaseModel):
    overall_outcome: ModerationOutcome
    visible: bool
    results: list[ModerationResult]
