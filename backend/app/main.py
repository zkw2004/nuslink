import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.push.worker import run_push_worker
from app.routers import (
    communities,
    group_drafts,
    health,
    matches,
    meetups,
    moderation,
    nudges,
    profile_extraction,
    tags,
)

@asynccontextmanager
async def lifespan(_: FastAPI):
    stop_event = asyncio.Event()
    worker_task: asyncio.Task[None] | None = None

    if (
        settings.push_worker_enabled
        and settings.supabase_url
        and settings.supabase_service_key
    ):
        worker_task = asyncio.create_task(run_push_worker(stop_event))

    yield

    if worker_task:
        stop_event.set()
        await worker_task


app = FastAPI(title="NUSLink API", version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(matches.router)
app.include_router(meetups.router)
app.include_router(moderation.router)
app.include_router(nudges.router)
app.include_router(communities.router)
app.include_router(group_drafts.router)
app.include_router(profile_extraction.router)
app.include_router(tags.router)
