"""MealMate AI -- Pantry Tracker Service entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import databases
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.health import router as health_router
from api.routes.pantry import router as pantry_router
from config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of database and Redis connections."""
    # Startup
    logger.info("Starting Pantry Tracker service v%s", settings.app_version)

    # Database
    db = databases.Database(settings.database_url)
    await db.connect()
    app.state.db = db
    logger.info("Connected to database")

    # Redis
    redis_client = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
    app.state.redis = redis_client
    logger.info("Connected to Redis")

    yield

    # Shutdown
    logger.info("Shutting down Pantry Tracker service")
    await db.disconnect()
    await redis_client.aclose()
    logger.info("Connections closed")


app = FastAPI(
    title="MealMate AI - Pantry Tracker",
    description="Tracks ingredient inventory, predicts depletion, and prevents over-ordering for Indian households.",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health_router)
app.include_router(pantry_router)
