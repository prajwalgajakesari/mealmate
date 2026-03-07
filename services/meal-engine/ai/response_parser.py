"""Pydantic-based validation for Claude's JSON responses."""

from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from models.schemas import (
    ClaudeMealPlanResponse,
    GroceryItem,
    Ingredient,
    MealPlanMeals,
    MealRecipe,
    NutritionInfo,
)

logger = logging.getLogger(__name__)


def parse_meal_plan_response(raw: dict[str, Any]) -> ClaudeMealPlanResponse:
    """Validate and parse Claude's raw JSON into a structured meal plan response.

    Raises ValueError with details if validation fails.
    """
    try:
        parsed = ClaudeMealPlanResponse.model_validate(raw)
        _validate_nutrition_sanity(parsed)
        return parsed
    except ValidationError as exc:
        logger.error("Meal plan validation failed: %s", exc.errors())
        raise ValueError(f"Invalid meal plan from AI: {exc.errors()}") from exc


def _validate_nutrition_sanity(plan: ClaudeMealPlanResponse) -> None:
    """Perform sanity checks on nutrition values."""
    warnings: list[str] = []

    # Check daily totals are roughly sum of meals
    meals = plan.meals
    computed_calories = (
        meals.breakfast.nutrition.calories
        + meals.lunch.nutrition.calories
        + meals.dinner.nutrition.calories
    )
    reported_calories = plan.daily_totals.calories

    if reported_calories > 0 and abs(computed_calories - reported_calories) > 200:
        warnings.append(
            f"Daily calorie total ({reported_calories}) differs from sum of meals "
            f"({computed_calories}) by more than 200 kcal"
        )

    # Check each meal is within reasonable bounds
    for meal_type in ("breakfast", "lunch", "dinner"):
        meal: MealRecipe = getattr(meals, meal_type)
        cal = meal.nutrition.calories
        if cal < 50:
            warnings.append(f"{meal_type} has suspiciously low calories: {cal}")
        if cal > 1500:
            warnings.append(f"{meal_type} has suspiciously high calories: {cal}")

    if warnings:
        for w in warnings:
            logger.warning("Nutrition sanity: %s", w)


def parse_substitution_response(raw: dict[str, Any]) -> dict[str, Any]:
    """Basic validation for substitution responses.

    Returns the validated dict. Raises ValueError if critical fields are missing.
    """
    if "original_ingredient" not in raw:
        raise ValueError("Missing 'original_ingredient' in substitution response")
    if "substitutions" not in raw or not isinstance(raw["substitutions"], list):
        raise ValueError("Missing or invalid 'substitutions' in response")
    if len(raw["substitutions"]) == 0:
        raise ValueError("No substitutions provided")
    return raw
