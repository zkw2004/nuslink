from collections import defaultdict
from datetime import UTC, date, datetime

from app.nudges.models import NudgeContext, NudgePreferences


def build_nudge_notifications(
    *,
    context: NudgeContext,
    preferences: NudgePreferences,
    today: date,
) -> list[dict]:
    notifications: list[dict] = []

    if preferences.time_enabled and context.module_codes:
        notifications.append(_build_time_nudge(context, today))

    if preferences.behaviour_enabled:
        behaviour_nudge = _build_behaviour_nudge(context, today)
        if behaviour_nudge:
            notifications.append(behaviour_nudge)

    if preferences.network_enabled:
        network_nudge = _build_network_nudge(context)
        if network_nudge:
            notifications.append(network_nudge)

    return notifications


def _build_time_nudge(context: NudgeContext, today: date) -> dict:
    phase, title, action = _semester_phase(today)
    module_code = context.module_codes[0]

    return _notification(
        context=context,
        nudge_type="nudge_time",
        title=title,
        body=f"{action} Start with a {module_code} group while your module is active.",
        href="/discover",
        dedupe_suffix=f"{context.semester}:{phase}:{module_code}",
        metadata={
            "category": "time",
            "semester": context.semester,
            "phase": phase,
            "module_code": module_code,
        },
    )


def _build_behaviour_nudge(
    context: NudgeContext,
    today: date,
) -> dict | None:
    profile_date = _as_utc(context.profile_created_at).date()
    account_age_days = max((today - profile_date).days, 0)

    if account_age_days >= 3 and context.active_group_count == 0:
        return _notification(
            context=context,
            nudge_type="nudge_behaviour",
            title="Build your first study circle",
            body=(
                "You have not joined a group yet. Browse current-semester groups "
                "and find one that fits your goals."
            ),
            href="/discover",
            dedupe_suffix=f"{context.semester}:no-group",
            metadata={
                "category": "behaviour",
                "reason": "no_joined_group",
                "semester": context.semester,
            },
        )

    if context.module_codes and context.timetable_slot_count == 0:
        return _notification(
            context=context,
            nudge_type="nudge_behaviour",
            title="Improve your schedule matches",
            body=(
                "Add your private availability so NUSLink can suggest better "
                "study partners and meetup times."
            ),
            href="/profile/settings",
            dedupe_suffix=f"{context.semester}:missing-timetable",
            metadata={
                "category": "behaviour",
                "reason": "missing_timetable",
                "semester": context.semester,
            },
        )

    return None


def _build_network_nudge(context: NudgeContext) -> dict | None:
    peers_by_module: dict[str, list[str]] = defaultdict(list)

    for peer in context.connected_peers:
        for module_code in peer.module_codes:
            if module_code in context.module_codes:
                peers_by_module[module_code].append(peer.display_name)

    if not peers_by_module:
        return None

    module_code, names = sorted(
        peers_by_module.items(),
        key=lambda item: (-len(item[1]), item[0]),
    )[0]
    unique_names = list(dict.fromkeys(names))

    if len(unique_names) == 1:
        body = (
            f"{unique_names[0]} is also taking {module_code} this semester. "
            "Reconnect and form a study plan together."
        )
    else:
        body = (
            f"{unique_names[0]} and {len(unique_names) - 1} other connection"
            f"{'s' if len(unique_names) > 2 else ''} are taking {module_code}. "
            "Bring your network into a study group."
        )

    return _notification(
        context=context,
        nudge_type="nudge_network",
        title="Your network overlaps",
        body=body,
        href="/people",
        dedupe_suffix=f"{context.semester}:{module_code}",
        metadata={
            "category": "network",
            "semester": context.semester,
            "module_code": module_code,
            "connection_count": len(unique_names),
        },
    )


def _notification(
    *,
    context: NudgeContext,
    nudge_type: str,
    title: str,
    body: str,
    href: str,
    dedupe_suffix: str,
    metadata: dict,
) -> dict:
    return {
        "recipient_id": context.user_id,
        "actor_id": None,
        "type": nudge_type,
        "title": title,
        "body": body,
        "href": href,
        "metadata": metadata,
        "dedupe_key": f"{nudge_type}:{context.user_id}:{dedupe_suffix}",
    }


def _semester_phase(today: date) -> tuple[str, str, str]:
    semester_start = date(today.year, 8 if today.month >= 8 else 1, 1)
    week = max((today - semester_start).days // 7 + 1, 1)

    if week <= 2:
        return "start", "Set up your semester", "Classes are getting underway."
    if week <= 6:
        return "momentum", "Keep your semester momentum", f"It is around week {week}."
    if week <= 10:
        return "midsemester", "Mid-semester check-in", f"It is around week {week}."
    return (
        "wrap-up",
        "Finish the semester together",
        "The semester is in its later weeks.",
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
