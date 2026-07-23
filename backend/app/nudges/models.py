from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class NudgePreferences:
    time_enabled: bool = True
    behaviour_enabled: bool = True
    network_enabled: bool = True


@dataclass(frozen=True)
class ConnectedModulePeer:
    user_id: str
    display_name: str
    module_codes: tuple[str, ...]


@dataclass(frozen=True)
class NudgeContext:
    user_id: str
    profile_created_at: datetime
    semester: str
    module_codes: tuple[str, ...]
    active_group_count: int
    timetable_slot_count: int
    connected_peers: tuple[ConnectedModulePeer, ...]
