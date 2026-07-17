from typing import Literal

from pydantic import BaseModel, Field, field_validator

TagType = Literal["interest", "project", "cca"]
NormalizationSource = Literal["rule", "ai", "passthrough"]


class TagNormalizationRequest(BaseModel):
    tag_type: TagType
    raw_tags: list[str] = Field(min_length=1, max_length=24)
    allow_ai_fallback: bool = True


class TagNormalizationResult(BaseModel):
    raw_tag: str
    normalized_raw_tag: str | None
    canonical_tags: list[str] = Field(default_factory=list)
    source: NormalizationSource
    matched: bool


class TagNormalizationResponse(BaseModel):
    results: list[TagNormalizationResult]


class TagClassification(BaseModel):
    canonical_tags: list[str] = Field(default_factory=list, max_length=3)
    no_match: bool = False

    @field_validator("canonical_tags")
    @classmethod
    def dedupe_tags(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []

        for tag in value:
            if tag in seen:
                continue
            seen.add(tag)
            deduped.append(tag)

        return deduped

