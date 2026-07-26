from dataclasses import dataclass


@dataclass(frozen=True)
class PushDelivery:
    delivery_id: str
    push_token_id: str
    expo_push_token: str
    notification_id: str
    title: str
    body: str
    href: str | None
    notification_type: str
    attempt_count: int


@dataclass(frozen=True)
class PushReceiptRequest:
    delivery_id: str
    push_token_id: str
    expo_ticket_id: str


@dataclass(frozen=True)
class ExpoPushResult:
    status: str
    ticket_id: str | None = None
    error: str | None = None


@dataclass(frozen=True)
class ExpoReceiptResult:
    status: str
    error: str | None = None
