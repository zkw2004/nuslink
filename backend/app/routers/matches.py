from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import AuthenticatedUser, get_current_user
from app.matching.repository import MatchRepository
from app.matching.schemas import PeopleMatchesResponse
from app.matching.scoring import get_current_semester_string, rank_candidates
from app.matching.supabase_repository import SupabaseMatchRepository

router = APIRouter(prefix="/v1/matches", tags=["matches"])


def get_match_repository() -> MatchRepository:
    return SupabaseMatchRepository()


@router.get("/people", response_model=PeopleMatchesResponse)
def get_people_matches(
    module_code: str | None = Query(default=None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    repository: MatchRepository = Depends(get_match_repository),
) -> PeopleMatchesResponse:
    semester = get_current_semester_string()
    current_user_profile = repository.get_profile(current_user.id)

    if current_user_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for the current user.",
        )

    current_user_registrations = repository.list_user_module_registrations(
        user_id=current_user.id,
        semester=semester,
    )

    if not current_user_registrations:
        return PeopleMatchesResponse(
            semester=semester,
            available_modules=[],
            candidates=[],
        )

    available_modules = sorted(
        {registration.module_code for registration in current_user_registrations}
    )

    if module_code:
        normalized_module_code = module_code.strip().upper()
        if normalized_module_code not in available_modules:
            return PeopleMatchesResponse(
                semester=semester,
                available_modules=available_modules,
                candidates=[],
            )
        scoped_modules = [normalized_module_code]
    else:
        scoped_modules = available_modules

    candidate_registrations = repository.list_module_registrations(
        semester=semester,
        module_codes=scoped_modules,
        exclude_user_id=current_user.id,
    )
    candidate_ids = sorted(
        {registration.user_id for registration in candidate_registrations}
    )
    candidate_profiles = repository.list_profiles(candidate_ids)
    timetable_slots = repository.list_timetable_slots(
        user_ids=[current_user.id, *candidate_ids],
        semester=semester,
    )
    connections = repository.list_connections(
        user_ids=[current_user.id, *candidate_ids]
    )

    ranked_candidates = rank_candidates(
        current_user_id=current_user.id,
        current_user_profile=current_user_profile,
        profiles=candidate_profiles,
        current_user_registrations=[
            registration
            for registration in current_user_registrations
            if registration.module_code in scoped_modules
        ],
        candidate_registrations=candidate_registrations,
        timetable_slots=timetable_slots,
        connections=connections,
    )
    try:
        repository.create_high_match_notifications(
            user_id=current_user.id,
            semester=semester,
            candidates=ranked_candidates,
        )
    except HTTPException:
        pass

    return PeopleMatchesResponse(
        semester=semester,
        available_modules=available_modules,
        candidates=ranked_candidates,
    )
