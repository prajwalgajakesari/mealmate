"""Health check endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(status="ok", service="meal-engine", version="1.0.0")
