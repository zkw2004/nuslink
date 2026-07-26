import json
from datetime import UTC, datetime, timedelta
from urllib import error, parse, request

from app.core.config import settings
from app.push.models import PushDelivery, PushReceiptRequest


class SupabasePushRepository:
    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError("Supabase data access is not configured for push delivery.")
        self.base_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": "application/json",
        }

    def claim_deliveries(self, batch_size: int = 100) -> list[PushDelivery]:
        rows = self._rpc("claim_pending_push_deliveries", {"batch_size_input": batch_size})
        return [PushDelivery(**row) for row in rows]

    def claim_receipts(self, batch_size: int = 1000) -> list[PushReceiptRequest]:
        rows = self._rpc("claim_push_receipts", {"batch_size_input": batch_size})
        return [PushReceiptRequest(**row) for row in rows]

    def mark_ticketed(self, delivery_id: str, ticket_id: str) -> None:
        now = datetime.now(UTC).isoformat()
        self._patch(
            "notification_push_deliveries",
            delivery_id,
            {
                "status": "ticketed",
                "expo_ticket_id": ticket_id,
                "ticketed_at": now,
                "processing_at": None,
                "last_error": None,
            },
        )

    def mark_delivered(self, delivery_id: str) -> None:
        now = datetime.now(UTC).isoformat()
        self._patch(
            "notification_push_deliveries",
            delivery_id,
            {"status": "delivered", "delivered_at": now, "last_error": None},
        )

    def mark_failed(self, delivery_id: str, message: str) -> None:
        self._patch(
            "notification_push_deliveries",
            delivery_id,
            {"status": "failed", "processing_at": None, "last_error": message[:500]},
        )

    def retry(self, delivery_id: str, message: str, attempt_count: int) -> None:
        delay_seconds = min(5 * (2 ** max(attempt_count - 1, 0)), 300)
        next_attempt = (datetime.now(UTC) + timedelta(seconds=delay_seconds)).isoformat()
        self._patch(
            "notification_push_deliveries",
            delivery_id,
            {
                "status": "pending",
                "processing_at": None,
                "next_attempt_at": next_attempt,
                "last_error": message[:500],
            },
        )

    def release_receipt(self, delivery_id: str) -> None:
        self._patch(
            "notification_push_deliveries",
            delivery_id,
            {"receipt_checked_at": None},
        )

    def deactivate_token(self, push_token_id: str) -> None:
        self._patch("push_tokens", push_token_id, {"enabled": False})

    def _rpc(self, name: str, payload: dict) -> list[dict]:
        req = request.Request(
            f"{self.base_url}/rpc/{name}",
            data=json.dumps(payload).encode("utf-8"),
            headers=self.headers,
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=10) as response:
                parsed = json.loads(response.read().decode("utf-8") or "[]")
        except (error.HTTPError, error.URLError) as exc:
            raise RuntimeError(f"Supabase RPC failed for {name}.") from exc
        if not isinstance(parsed, list):
            raise RuntimeError(f"Supabase RPC returned invalid data for {name}.")
        return parsed

    def _patch(self, table: str, row_id: str, payload: dict) -> None:
        query = parse.urlencode({"id": f"eq.{row_id}"})
        req = request.Request(
            f"{self.base_url}/{table}?{query}",
            data=json.dumps(payload).encode("utf-8"),
            headers={**self.headers, "Prefer": "return=minimal"},
            method="PATCH",
        )
        try:
            with request.urlopen(req, timeout=10):
                return
        except (error.HTTPError, error.URLError) as exc:
            raise RuntimeError(f"Supabase update failed for {table}.") from exc
