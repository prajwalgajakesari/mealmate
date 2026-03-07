"""Meal plan endpoints."""

from __future__ import annotations

import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request

from models.schemas import (
    GeneratePlanRequest,
    MealPlanHistoryItem,
    MealPlanMeals,
    MealPlanResponse,
    MealType,
    NutritionInfo,
    PlanStatus,
    SwapMealRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])


def _get_user_id(request: Request) -> uuid.UUID:
    """Extract user ID from X-User-Id header."""
    user_id_str = request.headers.get("X-User-Id")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header")
    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-User-Id header: must be a valid UUID")


def _get_planner(request: Request):
    """Get the MealPlanner instance from app state."""
    planner = getattr(request.app.state, "planner", None)
    if not planner:
        raise HTTPException(status_code=500, detail="Meal planner not initialized")
    return planner


@router.get("/today", response_model=MealPlanResponse)
async def get_today_plan(request: Request):
    """Get today's meal plan for the authenticated user."""
    user_id = _get_user_id(request)
    planner = _get_planner(request)

    try:
        plan = await planner.get_today_plan(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Error fetching today's plan: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch today's plan")

    if not plan:
        raise HTTPException(status_code=404, detail="No meal plan found for today. Generate one first.")

    return plan


@router.post("/generate", response_model=MealPlanResponse, status_code=201)
async def generate_plan(request: Request, body: GeneratePlanRequest | None = None):
    """Generate a new meal plan using Claude AI."""
    user_id = _get_user_id(request)
    planner = _get_planner(request)

    plan_date = body.plan_date if body else None
    preferences = body.preferences if body else None

    try:
        plan = await planner.generate_plan(
            user_id=user_id,
            plan_date=plan_date,
            preferences=preferences,
        )
    except ValueError as exc:
        logger.warning("Plan generation value error for user %s: %s", user_id, exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Plan generation runtime error for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Failed to generate meal plan. Please try again.")
    except Exception as exc:
        logger.error("Unexpected error generating plan for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Internal server error during plan generation")

    return plan


@router.post("/{plan_id}/swap/{meal_type}", response_model=MealPlanResponse)
async def swap_meal(
    plan_id: uuid.UUID,
    meal_type: MealType,
    request: Request,
    body: SwapMealRequest | None = None,
):
    """Swap one meal in an existing plan."""
    user_id = _get_user_id(request)
    planner = _get_planner(request)

    reason = body.reason if body else ""
    preferences = body.preferences if body else None

    try:
        plan = await planner.swap_meal(
            user_id=user_id,
            plan_id=plan_id,
            meal_type=meal_type.value,
            reason=reason,
            preferences=preferences,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Swap meal runtime error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to swap meal. Please try again.")
    except Exception as exc:
        logger.error("Unexpected error swapping meal: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during meal swap")

    return plan


@router.get("/history", response_model=list[MealPlanHistoryItem])
async def get_plan_history(request: Request, days: int = 30):
    """Get meal plan history for the last N days (default 30)."""
    user_id = _get_user_id(request)
    planner = _get_planner(request)

    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 1 and 365")

    try:
        plans = await planner.get_history(user_id, days=days)
    except Exception as exc:
        logger.error("Error fetching plan history: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch plan history")

    results = []
    for p in plans:
        meals_data = p.get("meals", {})
        totals_data = p.get("daily_totals")

        try:
            meals_obj = MealPlanMeals(**meals_data) if isinstance(meals_data, dict) else None
        except Exception:
            meals_obj = None

        if not meals_obj:
            continue

        results.append(MealPlanHistoryItem(
            id=p["id"] if isinstance(p["id"], uuid.UUID) else uuid.UUID(str(p["id"])),
            plan_date=p["plan_date"],
            meals=meals_obj,
            daily_totals=NutritionInfo(**totals_data) if isinstance(totals_data, dict) else None,
            status=PlanStatus(p.get("status", "generated")),
            created_at=p["created_at"],
        ))

    return results
