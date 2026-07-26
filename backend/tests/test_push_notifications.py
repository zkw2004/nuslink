from app.push.models import (
    ExpoPushResult,
    ExpoReceiptResult,
    PushDelivery,
    PushReceiptRequest,
)
from app.push.service import apply_push_results, apply_receipts, dispatch_once


def make_delivery(*, attempt_count: int = 1) -> PushDelivery:
    return PushDelivery(
        delivery_id="delivery-1",
        push_token_id="token-1",
        expo_push_token="ExponentPushToken[example]",
        notification_id="notification-1",
        title="New invite",
        body="You were invited to a study group.",
        href="/(tabs)/notifications",
        notification_type="group_invite_received",
        attempt_count=attempt_count,
    )


class FakeRepository:
    def __init__(self, deliveries=None) -> None:
        self.deliveries = deliveries or []
        self.calls: list[tuple] = []

    def claim_deliveries(self):
        return self.deliveries

    def mark_ticketed(self, *args):
        self.calls.append(("ticketed", *args))

    def mark_delivered(self, *args):
        self.calls.append(("delivered", *args))

    def mark_failed(self, *args):
        self.calls.append(("failed", *args))

    def retry(self, *args):
        self.calls.append(("retry", *args))

    def release_receipt(self, *args):
        self.calls.append(("release", *args))

    def deactivate_token(self, *args):
        self.calls.append(("deactivate", *args))


class FakeClient:
    def __init__(self, results=None, error: RuntimeError | None = None) -> None:
        self.results = results or []
        self.error = error

    def send(self, _deliveries):
        if self.error:
            raise self.error
        return self.results


def test_successful_ticket_is_persisted_for_receipt_check():
    repository = FakeRepository()
    apply_push_results(
        [make_delivery()],
        [ExpoPushResult(status="ok", ticket_id="ticket-1")],
        repository,
    )
    assert repository.calls == [("ticketed", "delivery-1", "ticket-1")]


def test_unregistered_device_is_deactivated_and_delivery_fails():
    repository = FakeRepository()
    apply_push_results(
        [make_delivery()],
        [ExpoPushResult(status="error", error="DeviceNotRegistered")],
        repository,
    )
    assert repository.calls == [
        ("deactivate", "token-1"),
        ("failed", "delivery-1", "DeviceNotRegistered"),
    ]


def test_transient_service_failure_retries_with_attempt_count():
    delivery = make_delivery(attempt_count=2)
    repository = FakeRepository([delivery])
    client = FakeClient(error=RuntimeError("Expo unavailable"))
    assert dispatch_once(repository, client) == 0
    assert repository.calls == [("retry", "delivery-1", "Expo unavailable", 2)]


def test_fifth_service_failure_becomes_terminal():
    delivery = make_delivery(attempt_count=5)
    repository = FakeRepository([delivery])
    client = FakeClient(error=RuntimeError("Expo unavailable"))
    dispatch_once(repository, client)
    assert repository.calls == [("failed", "delivery-1", "Expo unavailable")]


def test_receipts_deliver_release_missing_and_disable_dead_tokens():
    requests = [
        PushReceiptRequest("delivery-1", "token-1", "ticket-1"),
        PushReceiptRequest("delivery-2", "token-2", "ticket-2"),
        PushReceiptRequest("delivery-3", "token-3", "ticket-3"),
    ]
    repository = FakeRepository()
    apply_receipts(
        requests,
        {
            "ticket-1": ExpoReceiptResult(status="ok"),
            "ticket-2": ExpoReceiptResult(
                status="error",
                error="DeviceNotRegistered",
            ),
        },
        repository,
    )
    assert repository.calls == [
        ("delivered", "delivery-1"),
        ("deactivate", "token-2"),
        ("failed", "delivery-2", "DeviceNotRegistered"),
    ]
