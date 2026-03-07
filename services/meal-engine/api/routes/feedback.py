"""Feedback endpoints for meal plan ratings and comments."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from models.schemas import FeedbackRequest, FeedbackResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/plans", tags=["feedback"])


def _get_user_id(request: Request) -> uuid.UUID:
    """Extract user ID from X-User-Id header."""
    user_id_str = request.headers.get("X-User-Id")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header")
    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-User-Id header: must be a valid UUID")


def _get_db(request: Request):
    """Get the database instance from app state."""
    db = getattr(request.app.state, "db", None)
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


@router.post("/{plan_id}/feedback", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(plan_id: uuid.UUID, body: FeedbackRequest, request: Request):
    """Submit feedback (rating 1-5 + text) for a specific meal in a plan."""
    user_id = _get_user_id(request)
    db = _get_db(request)

    # Verify the plan exists and belongs to this user
    plan_check = await db.fetch_one(
        query="SELECT id FROM meals.meal_plans WHERE id = :plan_id AND user_id = :user_id",
        values={"plan_id": str(plan_id), "user_id": str(user_id)},
    )
    if not plan_check:
        raise HTTPException(status_code=404, detail=f"Meal plan {plan_id} not found for this user")

    feedback_id = uuid.uuid4()

    try:
        query = """
            INSERT INTO meals.meal_feedback (id, user_id, meal_plan_id, meal_type, rating, feedback_text, tags)
            VALUES (:id, :user_id, :meal_plan_id, :meal_type, :rating, :feedback_text, :tags)
            RETURNING id, created_at
        """
        result = await db.fetch_one(
            query=query,
            values={
                "id": str(feedback_id),
                "user_id": str(user_id),
                "meal_plan_id": str(plan_id),
                "meal_type": body.meal_type.value,
                "rating": body.rating,
                "feedback_text": body.feedback_text,
                "tags": body.tags,
            },
        )
    except Exception as exc:
        logger.error("Failed to store feedback: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    created_at = result._mapping["created_at"] if result else datetime.utcnow()

    return FeedbackResponse(
        id=feedback_id,
        user_id=user_id,
        meal_plan_id=plan_id,
        meal_type=body.meal_type,
        rating=body.rating,
        feedback_text=body.feedback_text,
        tags=body.tags,
        created_at=created_at,
    )


@router.get("/{plan_id}/feedback", response_model=list[FeedbackResponse])
async def get_feedback(plan_id: uuid.UUID, request: Request):
    """Get all feedback for a specific meal plan."""
    user_id = _get_user_id(request)
    db = _get_db(request)

    query = """
        SELECT id, user_id, meal_plan_id, meal_type, rating, feedback_text, tags, created_at
        FROM meals.meal_feedback
        WHERE meal_plan_id = :plan_id AND user_id = :user_id
        ORDER BY created_at DESC
    """
    try:
        rows = await db.fetch_all(
            query=query,
            values={"plan_id": str(plan_id), "user_id": str(user_id)},
        )
    except Exception as exc:
        logger.error("Failed to fetch feedback: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")

    results = []
    for row in rows:
        d = dict(row._mapping)
        tags = d.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.strip("{}").split(",") if t.strip()]

        results.append(FeedbackResponse(
            id=d["id"] if isinstance(d["id"], uuid.UUID) else uuid.UUID(str(d["id"])),
            user_id=d["user_id"] if isinstance(d["user_id"], uuid.UUID) else uuid.UUID(str(d["user_id"])),
            meal_plan_id=d["meal_plan_id"] if isinstance(d["meal_plan_id"], uuid.UUID) else uuid.UUID(str(d["meal_plan_id"])),
            meal_type=d["meal_type"],
            rating=d["rating"],
            feedback_text=d.get("feedback_text", ""),
            tags=tags,
            created_at=d["created_at"],
        ))

    return results
