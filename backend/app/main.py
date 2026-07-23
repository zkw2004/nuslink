from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    communities,
    group_drafts,
    health,
    matches,
    meetups,
    nudges,
    profile_extraction,
    tags,
)

app = FastAPI(title="NUSLink API", version=settings.app_version)

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
app.include_router(nudges.router)
app.include_router(communities.router)
app.include_router(group_drafts.router)
app.include_router(profile_extraction.router)
app.include_router(tags.router)
