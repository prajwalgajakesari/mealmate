"""Cuisine and meal rotation logic to avoid repetition within a 7-day window."""

from __future__ import annotations

import logging
from collections import Counter
from datetime import date, timedelta

from models.schemas import MealPlanMeals, MealRecipe

logger = logging.getLogger(__name__)

# Maximum times a cuisine can appear within 7 days
MAX_CUISINE_REPEATS_7D = 2

# Maximum times a specific recipe name can appear within 7 days
MAX_RECIPE_REPEATS_7D = 1

# Available cuisine pool for rotation
CUISINE_POOL = [
    "north_indian",
    "south_indian",
    "gujarati",
    "maharashtrian",
    "bengali",
    "rajasthani",
    "punjabi",
    "hyderabadi",
    "kerala",
    "mediterranean",
    "asian",
    "continental",
]


def extract_recent_meals(
    recent_plans: list[dict],
) -> tuple[list[str], list[str]]:
    """Extract cuisine names and recipe names from recent meal plan data.

    Args:
        recent_plans: List of meal plan dicts from DB (with 'meals' JSONB field).

    Returns:
        Tuple of (cuisine_list, recipe_name_list) from the last 7 days of plans.
    """
    cuisines: list[str] = []
    recipe_names: list[str] = []

    for plan in recent_plans:
        meals = plan.get("meals", {})
        for meal_type in ("breakfast", "lunch", "dinner"):
            meal = meals.get(meal_type, {})
            if isinstance(meal, dict):
                cuisine = meal.get("cuisine", "")
                name = meal.get("name", "")
                if cuisine:
                    cuisines.append(cuisine.lower().strip())
                if name:
                    recipe_names.append(name.lower().strip())

    return cuisines, recipe_names


def get_cuisine_constraints(recent_plans: list[dict]) -> dict:
    """Analyze recent plans and produce constraints for the AI prompt.

    Returns a dict with:
        - avoid_cuisines: cuisines that have been overused
        - avoid_recipes: recipe names to not repeat
        - preferred_cuisines: under-represented cuisines to encourage
    """
    cuisines, recipe_names = extract_recent_meals(recent_plans)
    cuisine_counts = Counter(cuisines)
    recipe_counts = Counter(recipe_names)

    avoid_cuisines = [
        c for c, count in cuisine_counts.items()
        if count >= MAX_CUISINE_REPEATS_7D
    ]

    avoid_recipes = [
        r for r, count in recipe_counts.items()
        if count >= MAX_RECIPE_REPEATS_7D
    ]

    # Prefer cuisines that haven't appeared recently
    used_cuisines_set = set(cuisines)
    preferred_cuisines = [
        c for c in CUISINE_POOL
        if c not in used_cuisines_set
    ]

    # If all cuisines have been used, prefer the least used ones
    if not preferred_cuisines:
        min_count = min(cuisine_counts.values()) if cuisine_counts else 0
        preferred_cuisines = [
            c for c, count in cuisine_counts.items()
            if count == min_count
        ]

    constraints = {
        "avoid_cuisines": avoid_cuisines,
        "avoid_recipes": avoid_recipes,
        "preferred_cuisines": preferred_cuisines[:5],  # top 5 suggestions
    }

    logger.info(
        "Cuisine constraints: avoid_cuisines=%s, avoid_recipes=%d, preferred=%s",
        avoid_cuisines,
        len(avoid_recipes),
        preferred_cuisines[:5],
    )
    return constraints


def validate_plan_rotation(
    proposed_meals: MealPlanMeals,
    recent_plans: list[dict],
) -> list[str]:
    """Validate a proposed meal plan against rotation rules.

    Returns a list of warning messages (empty if no issues).
    """
    warnings: list[str] = []
    cuisines, recipe_names = extract_recent_meals(recent_plans)
    cuisine_counts = Counter(cuisines)
    recipe_counts = Counter(recipe_names)

    for meal_type in ("breakfast", "lunch", "dinner"):
        meal: MealRecipe = getattr(proposed_meals, meal_type)
        c = meal.cuisine.lower().strip()
        n = meal.name.lower().strip()

        if cuisine_counts.get(c, 0) >= MAX_CUISINE_REPEATS_7D:
            warnings.append(
                f"{meal_type}: cuisine '{c}' already appeared "
                f"{cuisine_counts[c]} times in last 7 days"
            )

        if recipe_counts.get(n, 0) >= MAX_RECIPE_REPEATS_7D:
            warnings.append(
                f"{meal_type}: recipe '{n}' already appeared "
                f"in last 7 days"
            )

    if warnings:
        logger.warning("Plan rotation warnings: %s", warnings)
    return warnings


def get_seasonal_suggestions(plan_date: date | None = None) -> list[str]:
    """Return seasonal ingredient suggestions based on the month.

    Based on Indian seasonal produce calendar.
    """
    target_date = plan_date or date.today()
    month = target_date.month

    seasonal_map: dict[int, list[str]] = {
        1: ["carrot", "peas", "cauliflower", "methi", "spinach", "radish", "beetroot"],
        2: ["carrot", "peas", "cauliflower", "methi", "spinach", "strawberry"],
        3: ["drumstick", "raw mango", "cucumber", "bottle gourd", "ridge gourd"],
        4: ["mango", "watermelon", "cucumber", "bottle gourd", "pointed gourd"],
        5: ["mango", "watermelon", "jackfruit", "litchi", "tender coconut"],
        6: ["mango", "jamun", "jackfruit", "bitter gourd", "corn"],
        7: ["corn", "brinjal", "okra", "bitter gourd", "snake gourd"],
        8: ["corn", "okra", "brinjal", "ridge gourd", "cluster beans"],
        9: ["pumpkin", "sweet potato", "apple", "pomegranate", "brinjal"],
        10: ["pumpkin", "sweet potato", "apple", "guava", "pomegranate"],
        11: ["cauliflower", "peas", "carrot", "spinach", "orange", "guava"],
        12: ["cauliflower", "peas", "carrot", "spinach", "methi", "radish"],
    }

    return seasonal_map.get(month, [])
