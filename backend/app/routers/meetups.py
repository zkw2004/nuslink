from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import AuthenticatedUser, get_current_user
from app.matching.scoring import get_current_semester_string
from app.meetups.repository import MeetupRepository
from app.meetups.schemas import ChatKind, MeetupSuggestionResponse
from app.meetups.service import build_meetup_suggestions
from app.meetups.supabase_repository import SupabaseMeetupRepository

router = APIRouter(prefix="/v1/meetups", tags=["meetups"])


def get_meetup_repository() -> MeetupRepository:
    return SupabaseMeetupRepository()


@router.get("/suggestions", response_model=MeetupSuggestionResponse)
def get_meetup_suggestions(
    kind: ChatKind = Query(...),
    chat_id: str = Query(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    repository: MeetupRepository = Depends(get_meetup_repository),
) -> MeetupSuggestionResponse:
    if kind == "direct":
        participant_ids = repository.list_direct_participants(conversation_id=chat_id)
    elif kind == "community":
        participant_ids = repository.list_community_participants(community_id=chat_id)
    else:
        participant_ids = repository.list_group_participants(group_id=chat_id)

    if current_user.id not in participant_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this chat.",
        )

    semester = get_current_semester_string()
    timetable_slots = repository.list_timetable_slots(
        user_ids=participant_ids,
        semester=semester,
    )

    return MeetupSuggestionResponse(
        suggestions=build_meetup_suggestions(participant_ids, timetable_slots),
    )
