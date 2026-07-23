from datetime import date

from fastapi import APIRouter, Depends

from app.auth import AuthenticatedUser, get_current_user
from app.matching.scoring import get_current_semester_string
from app.nudges.repository import NudgeRepository
from app.nudges.schemas import NudgeEvaluationResponse
from app.nudges.service import build_nudge_notifications
from app.nudges.supabase_repository import SupabaseNudgeRepository

router = APIRouter(prefix="/v1/nudges", tags=["nudges"])


def get_nudge_repository() -> NudgeRepository:
    return SupabaseNudgeRepository()


@router.post("/evaluate", response_model=NudgeEvaluationResponse)
def evaluate_nudges(
    current_user: AuthenticatedUser = Depends(get_current_user),
    repository: NudgeRepository = Depends(get_nudge_repository),
) -> NudgeEvaluationResponse:
    semester = get_current_semester_string()
    context = repository.get_context(user_id=current_user.id, semester=semester)

    if context is None:
        return NudgeEvaluationResponse(evaluated=False, created_count=0)

    preferences = repository.get_preferences(user_id=current_user.id)
    notifications = build_nudge_notifications(
        context=context,
        preferences=preferences,
        today=date.today(),
    )
    created_count = repository.create_notifications(notifications)

    return NudgeEvaluationResponse(
        evaluated=True,
        created_count=created_count,
    )
