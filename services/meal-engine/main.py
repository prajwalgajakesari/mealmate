"""FastAPI application entry point for the Meal Engine service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import databases
import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.feedback import router as feedback_router
from api.routes.health import router as health_router
from api.routes.plans import router as plans_router
from config import settings
from core.planner import MealPlanner

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of database, Redis, and planner."""
    # -- Startup --
    logger.info("Starting Meal Engine service...")

    # Database
    db = databases.Database(settings.database_url)
    await db.connect()
    app.state.db = db
    logger.info("Database connected")

    # Redis (optional -- degrade gracefully)
    redis_client: redis.Redis | None = None
    try:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connected")
    except Exception as exc:
        logger.warning("Redis unavailable (%s); events will not be published", str(exc)[:100])
        redis_client = None
    app.state.redis = redis_client

    # Planner
    planner = MealPlanner(db=db, redis_client=redis_client)
    app.state.planner = planner
    logger.info("MealPlanner initialized")

    yield

    # -- Shutdown --
    logger.info("Shutting down Meal Engine service...")
    await planner.close()
    if redis_client:
        await redis_client.aclose()
    await db.disconnect()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-powered meal plan generation service for Indian households",
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
app.include_router(plans_router)
app.include_router(feedback_router)
