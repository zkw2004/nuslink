from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

GroupType = Literal[
    "study_group",
    "hackathon_team",
    "project_team",
    "tutoring_session",
]
PrivacySetting = Literal["public", "semi_private", "private"]
SemiPrivateRestriction = Literal["same_module", "same_year", "same_faculty"]


class GroupDraftRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    prompt: str = Field(min_length=10, max_length=1000)


class GroupDraftResponse(BaseModel):
    name: str | None = Field(default=None, max_length=50)
    type: GroupType | None = None
    module_code: str | None = Field(default=None, max_length=12)
    privacy: PrivacySetting | None = None
    restriction: SemiPrivateRestriction | None = None
    description: str | None = Field(default=None, max_length=500)
    venue: str | None = Field(default=None, max_length=120)
    min_size: int | None = Field(default=None, ge=1, le=99)
    max_size: int | None = Field(default=None, ge=1, le=99)

    @model_validator(mode="after")
    def validate_related_fields(self) -> "GroupDraftResponse":
        if self.privacy != "semi_private" and self.restriction is not None:
            raise ValueError("Restriction only applies to semi-private groups.")

        if self.privacy == "semi_private" and self.restriction is None:
            raise ValueError("Semi-private drafts require a restriction.")

        if (
            self.min_size is not None
            and self.max_size is not None
            and self.min_size > self.max_size
        ):
            raise ValueError("Minimum size cannot exceed maximum size.")

        return self
