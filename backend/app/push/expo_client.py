import json
from urllib import error, request

from app.push.models import ExpoPushResult, ExpoReceiptResult, PushDelivery

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"


class ExpoPushClient:
    def __init__(self, access_token: str = "") -> None:
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"

    def send(self, deliveries: list[PushDelivery]) -> list[ExpoPushResult]:
        if not deliveries:
            return []

        payload = [
            {
                "to": item.expo_push_token,
                "title": item.title,
                "body": item.body,
                "sound": "default",
                "channelId": "nuslink-updates",
                "data": {
                    "notificationId": item.notification_id,
                    "href": item.href,
                    "type": item.notification_type,
                },
            }
            for item in deliveries
        ]
        response = self._post(EXPO_PUSH_URL, payload)
        tickets = response.get("data")
        if not isinstance(tickets, list) or len(tickets) != len(deliveries):
            raise RuntimeError("Expo returned an invalid number of push tickets.")

        return [_parse_ticket(ticket) for ticket in tickets]

    def get_receipts(self, ticket_ids: list[str]) -> dict[str, ExpoReceiptResult]:
        if not ticket_ids:
            return {}

        response = self._post(EXPO_RECEIPTS_URL, {"ids": ticket_ids})
        raw_receipts = response.get("data")
        if not isinstance(raw_receipts, dict):
            raise RuntimeError("Expo returned an invalid push receipt response.")

        return {
            ticket_id: _parse_receipt(receipt)
            for ticket_id, receipt in raw_receipts.items()
            if isinstance(ticket_id, str)
        }

    def _post(self, url: str, payload: object) -> dict:
        req = request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=self.headers,
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=15) as response:
                parsed = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise RuntimeError(f"Expo push service returned HTTP {exc.code}.") from exc
        except error.URLError as exc:
            raise RuntimeError("Could not reach the Expo push service.") from exc

        if not isinstance(parsed, dict):
            raise RuntimeError("Expo push service returned an invalid response.")
        return parsed


def _get_error(payload: dict) -> str | None:
    details = payload.get("details")
    if isinstance(details, dict) and isinstance(details.get("error"), str):
        return details["error"]
    if isinstance(payload.get("message"), str):
        return payload["message"]
    return None


def _parse_ticket(payload: object) -> ExpoPushResult:
    if not isinstance(payload, dict):
        return ExpoPushResult(status="error", error="InvalidTicket")
    status = payload.get("status")
    if status == "ok" and isinstance(payload.get("id"), str):
        return ExpoPushResult(status="ok", ticket_id=payload["id"])
    return ExpoPushResult(
        status="error",
        error=_get_error(payload) or "UnknownPushError",
    )


def _parse_receipt(payload: object) -> ExpoReceiptResult:
    if not isinstance(payload, dict):
        return ExpoReceiptResult(status="error", error="InvalidReceipt")
    if payload.get("status") == "ok":
        return ExpoReceiptResult(status="ok")
    return ExpoReceiptResult(
        status="error",
        error=_get_error(payload) or "UnknownReceiptError",
    )
