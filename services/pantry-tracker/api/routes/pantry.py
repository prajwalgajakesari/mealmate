"""Pantry management API endpoints."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status

from config import settings
from core.categories import classify_ingredient
from core.tracker import PantryTracker
from models.schemas import (
    AfterOrderRequest,
    AfterOrderResponse,
    CheckOrderRequest,
    CheckOrderResponse,
    ConsumeRequest,
    ConsumeResponse,
    PantryItemCreate,
    PantryItemResponse,
    PantryItemUpdate,
    PantryStateResponse,
    ReorderResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/pantry", tags=["pantry"])

CACHE_KEY_PREFIX = "pantry"
tracker = PantryTracker()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cache_key(user_id: str) -> str:
    return f"{CACHE_KEY_PREFIX}:{user_id}"


async def _invalidate_cache(request: Request, user_id: str) -> None:
    """Delete the cached pantry state for a user."""
    try:
        redis = request.app.state.redis
        await redis.delete(_cache_key(user_id))
    except Exception as exc:
        logger.warning("Failed to invalidate cache for user %s: %s", user_id, exc)


def _row_to_response(row: Any) -> PantryItemResponse:
    """Convert a database row (asyncpg Record or dict) to a Pydantic model."""
    data = dict(row) if not isinstance(row, dict) else row
    return PantryItemResponse(**data)


def _validate_user_id(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Id header is required.",
        )
    try:
        UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-Id must be a valid UUID.",
        )
    return x_user_id


# ---------------------------------------------------------------------------
# GET /api/v1/pantry -- Full pantry state grouped by status
# ---------------------------------------------------------------------------


@router.get("", response_model=PantryStateResponse)
async def get_pantry_state(
    request: Request,
    x_user_id: str | None = Header(None),
) -> PantryStateResponse:
    """Return the full pantry state for a user, grouped by status."""
    user_id = _validate_user_id(x_user_id)

    # Try cache first
    try:
        redis = request.app.state.redis
        cached = await redis.get(_cache_key(user_id))
        if cached:
            return PantryStateResponse(**json.loads(cached))
    except Exception as exc:
        logger.warning("Cache read failed: %s", exc)

    db = request.app.state.db
    rows = await db.fetch_all(
        "SELECT * FROM pantry.pantry_items WHERE user_id = :user_id ORDER BY ingredient_name",
        {"user_id": user_id},
    )

    grouped: dict[str, list[PantryItemResponse]] = {
        "stocked": [],
        "low": [],
        "empty": [],
        "unknown": [],
    }
    for row in rows:
        item = _row_to_response(row)
        bucket = item.status if item.status in grouped else "unknown"
        grouped[bucket].append(item)

    response = PantryStateResponse(
        **grouped,
        total_items=len(rows),
    )

    # Cache the result
    try:
        await redis.set(
            _cache_key(user_id),
            response.model_dump_json(),
            ex=settings.pantry_cache_ttl_seconds,
        )
    except Exception as exc:
        logger.warning("Cache write failed: %s", exc)

    return response


# ---------------------------------------------------------------------------
# GET /api/v1/pantry/reorder -- Items that need reordering
# ---------------------------------------------------------------------------


@router.get("/reorder", response_model=ReorderResponse)
async def get_reorder_items(
    request: Request,
    x_user_id: str | None = Header(None),
) -> ReorderResponse:
    """Return pantry items that need reordering."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    rows = await db.fetch_all(
        "SELECT * FROM pantry.pantry_items WHERE user_id = :user_id AND needs_reorder = TRUE "
        "ORDER BY ingredient_name",
        {"user_id": user_id},
    )
    items = [_row_to_response(r) for r in rows]
    return ReorderResponse(items=items, count=len(items))


# ---------------------------------------------------------------------------
# POST /api/v1/pantry/items -- Add a new pantry item
# ---------------------------------------------------------------------------


@router.post("/items", response_model=PantryItemResponse, status_code=status.HTTP_201_CREATED)
async def add_pantry_item(
    body: PantryItemCreate,
    request: Request,
    x_user_id: str | None = Header(None),
) -> PantryItemResponse:
    """Add a new ingredient to the user's pantry."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    # Auto-classify if category not meaningful
    category = body.category or classify_ingredient(body.ingredient_name)

    # Determine initial status
    servings = body.estimated_servings_remaining
    if servings == 0:
        item_status = "unknown"
        needs_reorder = False
    elif servings <= 2:
        item_status = "low"
        needs_reorder = True
    else:
        item_status = "stocked"
        needs_reorder = False

    try:
        row = await db.fetch_one(
            """
            INSERT INTO pantry.pantry_items
                (user_id, ingredient_name, category, last_ordered_qty,
                 estimated_servings_remaining, preferred_brand, preferred_variant,
                 max_price, status, needs_reorder)
            VALUES
                (:user_id, :ingredient_name, :category, :last_ordered_qty,
                 :estimated_servings_remaining, :preferred_brand, :preferred_variant,
                 :max_price, :status, :needs_reorder)
            RETURNING *
            """,
            {
                "user_id": user_id,
                "ingredient_name": body.ingredient_name.strip().lower(),
                "category": category,
                "last_ordered_qty": body.last_ordered_qty,
                "estimated_servings_remaining": servings,
                "preferred_brand": body.preferred_brand,
                "preferred_variant": body.preferred_variant,
                "max_price": body.max_price,
                "status": item_status,
                "needs_reorder": needs_reorder,
            },
        )
    except Exception as exc:
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Pantry item '{body.ingredient_name}' already exists for this user.",
            )
        logger.error("Failed to insert pantry item: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add pantry item.",
        )

    await _invalidate_cache(request, user_id)
    return _row_to_response(row)


# ---------------------------------------------------------------------------
# PUT /api/v1/pantry/items/{item_id} -- Update pantry item
# ---------------------------------------------------------------------------


@router.put("/items/{item_id}", response_model=PantryItemResponse)
async def update_pantry_item(
    item_id: UUID,
    body: PantryItemUpdate,
    request: Request,
    x_user_id: str | None = Header(None),
) -> PantryItemResponse:
    """Update an existing pantry item (e.g., 'I bought quinoa')."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    # Verify ownership
    existing = await db.fetch_one(
        "SELECT * FROM pantry.pantry_items WHERE id = :id AND user_id = :user_id",
        {"id": str(item_id), "user_id": user_id},
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pantry item {item_id} not found.",
        )

    # Build dynamic UPDATE
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return _row_to_response(existing)

    set_clauses: list[str] = []
    params: dict[str, Any] = {"id": str(item_id), "user_id": user_id}
    for field, value in updates.items():
        set_clauses.append(f"{field} = :{field}")
        params[field] = value

    set_clauses.append("updated_at = NOW()")
    set_sql = ", ".join(set_clauses)

    row = await db.fetch_one(
        f"UPDATE pantry.pantry_items SET {set_sql} WHERE id = :id AND user_id = :user_id RETURNING *",
        params,
    )

    await _invalidate_cache(request, user_id)
    return _row_to_response(row)


# ---------------------------------------------------------------------------
# DELETE /api/v1/pantry/items/{item_id} -- Remove pantry item
# ---------------------------------------------------------------------------


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pantry_item(
    item_id: UUID,
    request: Request,
    x_user_id: str | None = Header(None),
) -> None:
    """Remove a pantry item."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    result = await db.execute(
        "DELETE FROM pantry.pantry_items WHERE id = :id AND user_id = :user_id",
        {"id": str(item_id), "user_id": user_id},
    )

    # databases library returns row count or None depending on driver
    # If nothing deleted, return 404
    existing = await db.fetch_one(
        "SELECT id FROM pantry.pantry_items WHERE id = :id",
        {"id": str(item_id)},
    )
    # If the item still exists, the user didn't own it; if it's gone, success
    if existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pantry item {item_id} not found for this user.",
        )

    await _invalidate_cache(request, user_id)


# ---------------------------------------------------------------------------
# POST /api/v1/pantry/check-order -- Decide what to order
# ---------------------------------------------------------------------------


@router.post("/check-order", response_model=CheckOrderResponse)
async def check_order(
    body: CheckOrderRequest,
    request: Request,
    x_user_id: str | None = Header(None),
) -> CheckOrderResponse:
    """Given a list of ingredients from a meal plan, return order decisions."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    # Fetch all pantry items for the user at once
    rows = await db.fetch_all(
        "SELECT * FROM pantry.pantry_items WHERE user_id = :user_id",
        {"user_id": user_id},
    )
    items_by_name: dict[str, dict[str, Any]] = {}
    for row in rows:
        d = dict(row) if not isinstance(row, dict) else row
        items_by_name[d["ingredient_name"].lower()] = d

    decisions = tracker.get_order_decisions(items_by_name, body.ingredients)
    to_order = sum(1 for d in decisions if d.should_order)

    return CheckOrderResponse(
        decisions=decisions,
        total_to_order=to_order,
        total_skipped=len(decisions) - to_order,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/pantry/consume -- Deduct usage
# ---------------------------------------------------------------------------


@router.post("/consume", response_model=ConsumeResponse)
async def consume_ingredients(
    body: ConsumeRequest,
    request: Request,
    x_user_id: str | None = Header(None),
) -> ConsumeResponse:
    """Deduct usage when a meal plan is executed."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    updated_items: list[PantryItemResponse] = []
    not_found: list[str] = []

    for ing in body.ingredients:
        name_lower = ing.name.strip().lower()

        row = await db.fetch_one(
            "SELECT * FROM pantry.pantry_items WHERE user_id = :user_id AND ingredient_name = :name",
            {"user_id": user_id, "name": name_lower},
        )

        if not row:
            not_found.append(ing.name)
            continue

        item_dict = dict(row) if not isinstance(row, dict) else row
        updates = tracker.compute_after_consume_fields(item_dict, ing.quantity_grams)

        updated_row = await db.fetch_one(
            """
            UPDATE pantry.pantry_items
            SET estimated_servings_remaining = :estimated_servings_remaining,
                avg_daily_usage_grams = :avg_daily_usage_grams,
                status = :status,
                needs_reorder = :needs_reorder,
                updated_at = :updated_at
            WHERE id = :id
            RETURNING *
            """,
            {**updates, "id": str(item_dict["id"])},
        )

        # Log the usage
        try:
            await db.execute(
                """
                INSERT INTO pantry.usage_log (user_id, pantry_item_id, meal_plan_id, estimated_usage_grams)
                VALUES (:user_id, :pantry_item_id, :meal_plan_id, :usage_grams)
                """,
                {
                    "user_id": user_id,
                    "pantry_item_id": str(item_dict["id"]),
                    "meal_plan_id": str(body.meal_plan_id) if body.meal_plan_id else None,
                    "usage_grams": ing.quantity_grams,
                },
            )
        except Exception as exc:
            logger.warning("Failed to log usage for %s: %s", name_lower, exc)

        if updated_row:
            updated_items.append(_row_to_response(updated_row))

    await _invalidate_cache(request, user_id)

    return ConsumeResponse(updated_items=updated_items, not_found=not_found)


# ---------------------------------------------------------------------------
# POST /api/v1/pantry/after-order -- Update pantry state after order
# ---------------------------------------------------------------------------


@router.post("/after-order", response_model=AfterOrderResponse)
async def after_order(
    body: AfterOrderRequest,
    request: Request,
    x_user_id: str | None = Header(None),
) -> AfterOrderResponse:
    """Update pantry state after an order is placed."""
    user_id = _validate_user_id(x_user_id)
    db = request.app.state.db

    updated_items: list[PantryItemResponse] = []

    for ordered in body.items:
        name_lower = ordered.ingredient_name.strip().lower()
        category = classify_ingredient(name_lower)

        # Fetch or create the pantry item
        row = await db.fetch_one(
            "SELECT * FROM pantry.pantry_items WHERE user_id = :user_id AND ingredient_name = :name",
            {"user_id": user_id, "name": name_lower},
        )

        item_dict = dict(row) if row and not isinstance(row, dict) else (row if isinstance(row, dict) else None)

        updates = tracker.compute_after_order_fields(
            item_dict,
            qty_ordered_str=ordered.quantity,
            qty_grams=ordered.quantity_grams,
            servings=ordered.servings,
        )

        if item_dict:
            # Update existing
            updated_row = await db.fetch_one(
                """
                UPDATE pantry.pantry_items
                SET last_ordered_at = :last_ordered_at,
                    last_ordered_qty = :last_ordered_qty,
                    estimated_servings_remaining = :estimated_servings_remaining,
                    times_ordered = :times_ordered,
                    avg_days_between_orders = :avg_days_between_orders,
                    status = :status,
                    needs_reorder = :needs_reorder,
                    updated_at = :updated_at
                WHERE id = :id
                RETURNING *
                """,
                {**updates, "id": str(item_dict["id"])},
            )
        else:
            # Create new item
            updated_row = await db.fetch_one(
                """
                INSERT INTO pantry.pantry_items
                    (user_id, ingredient_name, category, last_ordered_at,
                     last_ordered_qty, estimated_servings_remaining, times_ordered,
                     avg_days_between_orders, status, needs_reorder)
                VALUES
                    (:user_id, :name, :category, :last_ordered_at,
                     :last_ordered_qty, :estimated_servings_remaining, :times_ordered,
                     :avg_days_between_orders, :status, :needs_reorder)
                RETURNING *
                """,
                {
                    "user_id": user_id,
                    "name": name_lower,
                    "category": category,
                    **updates,
                },
            )

        if updated_row:
            updated_items.append(_row_to_response(updated_row))

    await _invalidate_cache(request, user_id)

    return AfterOrderResponse(updated_items=updated_items)
