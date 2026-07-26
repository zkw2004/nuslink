import asyncio
import logging

from app.core.config import settings
from app.push.expo_client import ExpoPushClient
from app.push.repository import SupabasePushRepository
from app.push.service import check_receipts_once, dispatch_once

logger = logging.getLogger(__name__)


async def run_push_worker(stop_event: asyncio.Event) -> None:
    repository = SupabasePushRepository()
    client = ExpoPushClient(settings.expo_push_access_token)

    while not stop_event.is_set():
        try:
            await asyncio.to_thread(dispatch_once, repository, client)
            await asyncio.to_thread(check_receipts_once, repository, client)
        except Exception:
            logger.exception("Push notification worker iteration failed.")

        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=max(settings.push_worker_interval_seconds, 1.0),
            )
        except TimeoutError:
            continue
