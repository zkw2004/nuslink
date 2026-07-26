from app.push.expo_client import ExpoPushClient
from app.push.models import ExpoPushResult, ExpoReceiptResult, PushDelivery, PushReceiptRequest

TERMINAL_TOKEN_ERRORS = {"DeviceNotRegistered"}
RETRYABLE_TICKET_ERRORS = {"MessageRateExceeded"}


def apply_push_results(
    deliveries: list[PushDelivery],
    results: list[ExpoPushResult],
    repository,
) -> None:
    if len(deliveries) != len(results):
        raise ValueError("Each push delivery must have one Expo ticket result.")

    for delivery, result in zip(deliveries, results, strict=True):
        if result.status == "ok" and result.ticket_id:
            repository.mark_ticketed(delivery.delivery_id, result.ticket_id)
            continue

        error = result.error or "UnknownPushError"
        if error in TERMINAL_TOKEN_ERRORS:
            repository.deactivate_token(delivery.push_token_id)
        if error in RETRYABLE_TICKET_ERRORS:
            if delivery.attempt_count >= 5:
                repository.mark_failed(delivery.delivery_id, error)
            else:
                repository.retry(delivery.delivery_id, error, delivery.attempt_count)
        else:
            repository.mark_failed(delivery.delivery_id, error)


def apply_receipts(
    requests: list[PushReceiptRequest],
    receipts: dict[str, ExpoReceiptResult],
    repository,
) -> None:
    for item in requests:
        receipt = receipts.get(item.expo_ticket_id)
        if receipt is None:
            continue
        if receipt.status == "ok":
            repository.mark_delivered(item.delivery_id)
            continue

        error = receipt.error or "UnknownReceiptError"
        if error in TERMINAL_TOKEN_ERRORS:
            repository.deactivate_token(item.push_token_id)
        repository.mark_failed(item.delivery_id, error)


def dispatch_once(repository, client: ExpoPushClient) -> int:
    deliveries = repository.claim_deliveries()
    if not deliveries:
        return 0
    try:
        results = client.send(deliveries)
    except RuntimeError as exc:
        for delivery in deliveries:
            if delivery.attempt_count >= 5:
                repository.mark_failed(delivery.delivery_id, str(exc))
            else:
                repository.retry(delivery.delivery_id, str(exc), delivery.attempt_count)
        return 0
    apply_push_results(deliveries, results, repository)
    return sum(result.status == "ok" for result in results)


def check_receipts_once(repository, client: ExpoPushClient) -> int:
    requests = repository.claim_receipts()
    if not requests:
        return 0
    try:
        receipts = client.get_receipts([item.expo_ticket_id for item in requests])
    except RuntimeError:
        return 0
    apply_receipts(requests, receipts, repository)
    return len(receipts)
