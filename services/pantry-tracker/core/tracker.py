"""PantryTracker -- core business logic for pantry inventory management.

Reorder rules:
  - Staples (salt, turmeric, atta, oil, basic spices): NEVER order.
  - Fresh items (tomato, onion, paneer, coriander, etc.): ALWAYS order if in today's plan.
  - Pantry items (dal, rice, quinoa, rajma, etc.): Smart reorder:
      * Never ordered before -> order
      * Estimated servings <= 2 -> order (running low)
      * Days since last order >= 80% of avg interval -> order
      * Otherwise -> don't order (still stocked)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from core.categories import classify_ingredient
from models.schemas import (
    IngredientAmount,
    OrderDecision,
    PantryItemResponse,
)

logger = logging.getLogger(__name__)

# Estimated grams consumed per serving for common categories
DEFAULT_GRAMS_PER_SERVING: dict[str, float] = {
    "fresh": 150.0,
    "pantry": 100.0,
    "staple": 50.0,
}


class PantryTracker:
    """Stateless helper that operates on pantry item dicts from the database."""

    # ------------------------------------------------------------------
    # Core decision
    # ------------------------------------------------------------------

    @staticmethod
    def should_reorder(
        item: dict[str, Any] | None,
        ingredient_name: str,
        *,
        needed: bool = True,
    ) -> OrderDecision:
        """Determine whether a single ingredient should be ordered.

        Args:
            item: Row from pantry.pantry_items as a dict, or None if ingredient
                  has never been tracked.
            ingredient_name: The normalised ingredient name.
            needed: Whether the ingredient appears in today's meal plan.

        Returns:
            An ``OrderDecision`` with the verdict and human-readable reason.
        """
        category = classify_ingredient(ingredient_name)
        current_servings: int | None = None
        pantry_item_id: UUID | None = None

        if item is not None:
            current_servings = item.get("estimated_servings_remaining", 0)
            raw_id = item.get("id")
            pantry_item_id = UUID(str(raw_id)) if raw_id else None

        # Rule 1: Kitchen staples -- NEVER order
        if category == "staple":
            return OrderDecision(
                ingredient_name=ingredient_name,
                category=category,
                should_order=False,
                reason="Kitchen staple -- assumed always available at home.",
                current_servings=current_servings,
                pantry_item_id=pantry_item_id,
            )

        # Rule 2: Fresh items -- ALWAYS order if needed in today's plan
        if category == "fresh":
            if needed:
                return OrderDecision(
                    ingredient_name=ingredient_name,
                    category=category,
                    should_order=True,
                    reason="Fresh item required for today's meal plan -- always order fresh.",
                    current_servings=current_servings,
                    pantry_item_id=pantry_item_id,
                )
            return OrderDecision(
                ingredient_name=ingredient_name,
                category=category,
                should_order=False,
                reason="Fresh item but not needed for today's plan.",
                current_servings=current_servings,
                pantry_item_id=pantry_item_id,
            )

        # Rule 3: Pantry items -- Smart reorder
        if item is None or item.get("times_ordered", 0) == 0:
            return OrderDecision(
                ingredient_name=ingredient_name,
                category=category,
                should_order=True,
                reason="Never ordered before -- order to stock up.",
                current_servings=current_servings,
                pantry_item_id=pantry_item_id,
            )

        servings = item.get("estimated_servings_remaining", 0)
        if servings <= 2:
            return OrderDecision(
                ingredient_name=ingredient_name,
                category=category,
                should_order=True,
                reason=f"Running low -- only {servings} estimated serving(s) remaining.",
                current_servings=current_servings,
                pantry_item_id=pantry_item_id,
            )

        avg_interval = item.get("avg_days_between_orders")
        last_ordered_at = item.get("last_ordered_at")
        if avg_interval and last_ordered_at:
            if isinstance(last_ordered_at, str):
                last_ordered_at = datetime.fromisoformat(last_ordered_at)
            if last_ordered_at.tzinfo is None:
                last_ordered_at = last_ordered_at.replace(tzinfo=timezone.utc)
            days_since = (datetime.now(timezone.utc) - last_ordered_at).days
            threshold = int(avg_interval * 0.8)
            if days_since >= threshold:
                return OrderDecision(
                    ingredient_name=ingredient_name,
                    category=category,
                    should_order=True,
                    reason=(
                        f"Due for reorder -- {days_since} days since last order "
                        f"(threshold: {threshold} days, avg interval: {avg_interval} days)."
                    ),
                    current_servings=current_servings,
                    pantry_item_id=pantry_item_id,
                )

        return OrderDecision(
            ingredient_name=ingredient_name,
            category=category,
            should_order=False,
            reason=f"Still stocked -- {servings} serving(s) remaining, not due for reorder.",
            current_servings=current_servings,
            pantry_item_id=pantry_item_id,
        )

    # ------------------------------------------------------------------
    # Batch decision
    # ------------------------------------------------------------------

    @staticmethod
    def get_order_decisions(
        pantry_items_by_name: dict[str, dict[str, Any]],
        ingredients_needed: list[IngredientAmount],
    ) -> list[OrderDecision]:
        """Run reorder logic for a full ingredient list.

        Args:
            pantry_items_by_name: Map of lower-cased ingredient name to DB row dict.
            ingredients_needed: Ingredients from the meal plan.

        Returns:
            List of ``OrderDecision`` for every ingredient.
        """
        decisions: list[OrderDecision] = []
        for ing in ingredients_needed:
            name_lower = ing.name.strip().lower()
            item = pantry_items_by_name.get(name_lower)
            decision = PantryTracker.should_reorder(
                item,
                name_lower,
                needed=True,
            )
            decisions.append(decision)
        return decisions

    # ------------------------------------------------------------------
    # Post-order update helpers (return field dicts for DB update)
    # ------------------------------------------------------------------

    @staticmethod
    def compute_after_order_fields(
        item: dict[str, Any] | None,
        qty_ordered_str: str,
        qty_grams: float,
        servings: int,
    ) -> dict[str, Any]:
        """Compute the field values to write after an order is placed.

        Returns a dict suitable for building an UPDATE query.
        """
        now = datetime.now(timezone.utc)
        times_ordered = (item.get("times_ordered", 0) if item else 0) + 1
        prev_servings = item.get("estimated_servings_remaining", 0) if item else 0

        # Running average for days between orders
        avg_interval: int | None = None
        if item and item.get("last_ordered_at"):
            last = item["last_ordered_at"]
            if isinstance(last, str):
                last = datetime.fromisoformat(last)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            days_gap = max((now - last).days, 1)
            old_avg = item.get("avg_days_between_orders")
            if old_avg:
                # Exponential moving average
                avg_interval = int(0.7 * old_avg + 0.3 * days_gap)
            else:
                avg_interval = days_gap

        return {
            "last_ordered_at": now,
            "last_ordered_qty": qty_ordered_str,
            "estimated_servings_remaining": prev_servings + servings,
            "times_ordered": times_ordered,
            "avg_days_between_orders": avg_interval,
            "status": "stocked",
            "needs_reorder": False,
            "updated_at": now,
        }

    # ------------------------------------------------------------------
    # Consume helper
    # ------------------------------------------------------------------

    @staticmethod
    def compute_after_consume_fields(
        item: dict[str, Any],
        usage_grams: float,
    ) -> dict[str, Any]:
        """Compute field values after consuming an ingredient.

        Returns a dict suitable for building an UPDATE query.
        """
        now = datetime.now(timezone.utc)
        category = item.get("category", "pantry")
        grams_per_serving = DEFAULT_GRAMS_PER_SERVING.get(category, 100.0)
        servings_used = max(1, int(round(usage_grams / grams_per_serving)))
        current = item.get("estimated_servings_remaining", 0)
        new_servings = max(0, current - servings_used)

        # Derive status
        if new_servings == 0:
            status = "empty"
            needs_reorder = True
        elif new_servings <= 2:
            status = "low"
            needs_reorder = True
        else:
            status = "stocked"
            needs_reorder = False

        # Update running avg daily usage
        old_avg = item.get("avg_daily_usage_grams") or 0.0
        if old_avg > 0:
            new_avg = 0.7 * old_avg + 0.3 * usage_grams
        else:
            new_avg = usage_grams

        return {
            "estimated_servings_remaining": new_servings,
            "avg_daily_usage_grams": round(new_avg, 2),
            "status": status,
            "needs_reorder": needs_reorder,
            "updated_at": now,
        }
