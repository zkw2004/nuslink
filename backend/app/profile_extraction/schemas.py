from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ProfileEntryCategory = Literal["work", "project", "competition"]
ProfileLinkLabel = Literal["linkedin", "github", "portfolio", "other"]


class ProfileExtractionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    filename: str = Field(min_length=1, max_length=160)
    mime_type: Literal[
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
    ]
    file_base64: str = Field(min_length=1, max_length=14_000_000)


class ExtractedProfileItem(BaseModel):
    value: str = Field(min_length=1, max_length=100)
    evidence: str | None = Field(default=None, max_length=240)


class ExtractedProfileLink(BaseModel):
    label: ProfileLinkLabel
    url: str = Field(min_length=1, max_length=500)
    evidence: str | None = Field(default=None, max_length=240)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith(("https://", "http://")):
            raise ValueError("Professional links must use http or https.")
        return normalized


class ExtractedProfileEntry(BaseModel):
    category: ProfileEntryCategory
    title: str = Field(min_length=1, max_length=140)
    organization: str | None = Field(default=None, max_length=140)
    date_label: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    evidence: str | None = Field(default=None, max_length=240)


class ProfileExtractionResponse(BaseModel):
    suggested_bio: str | None = Field(default=None, max_length=200)
    skills: list[ExtractedProfileItem] = Field(default_factory=list, max_length=30)
    interests: list[ExtractedProfileItem] = Field(
        default_factory=list,
        max_length=20,
    )
    cca_tags: list[ExtractedProfileItem] = Field(
        default_factory=list,
        max_length=20,
    )
    professional_links: list[ExtractedProfileLink] = Field(
        default_factory=list,
        max_length=10,
    )
    entries: list[ExtractedProfileEntry] = Field(
        default_factory=list,
        max_length=30,
    )
    warnings: list[str] = Field(default_factory=list, max_length=10)


class ProfileExtractionProviderHealthResponse(BaseModel):
    provider: str
    model: str | None
    configured: bool
    ok: bool
    error: str | None = None
