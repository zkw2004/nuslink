from pydantic import BaseModel


class NudgeEvaluationResponse(BaseModel):
    evaluated: bool
    created_count: int
