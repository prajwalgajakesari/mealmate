"""Health check endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from models.schemas import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check(request: Request) -> HealthResponse:
    """Return service health status including database and Redis connectivity."""
    db_status = "unknown"
    redis_status = "unknown"

    # Check database
    try:
        db = request.app.state.db
        await db.execute("SELECT 1")
        db_status = "connected"
    except Exception as exc:
        logger.warning("Database health check failed: %s", exc)
        db_status = "disconnected"

    # Check Redis
    try:
        redis = request.app.state.redis
        await redis.ping()
        redis_status = "connected"
    except Exception as exc:
        logger.warning("Redis health check failed: %s", exc)
        redis_status = "disconnected"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        service="pantry-tracker",
        version="1.0.0",
        database=db_status,
        redis=redis_status,
    )
