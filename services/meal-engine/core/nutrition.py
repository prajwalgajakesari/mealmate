"""Calorie and macronutrient calculator using the Mifflin-St Jeor equation."""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Activity level multipliers for TDEE
ACTIVITY_MULTIPLIERS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

# Macro split ratios: (protein_pct, carbs_pct, fat_pct)
# Percentages of total calories
MACRO_SPLITS: dict[str, tuple[float, float, float]] = {
    "general_health": (0.20, 0.50, 0.30),
    "weight_loss": (0.30, 0.40, 0.30),
    "muscle_gain": (0.35, 0.40, 0.25),
    "heart_health": (0.20, 0.55, 0.25),
    "diabetic_friendly": (0.25, 0.40, 0.35),
    "maintenance": (0.20, 0.50, 0.30),
}

# Caloric deficit/surplus by goal
CALORIE_ADJUSTMENTS: dict[str, float] = {
    "general_health": 1.0,
    "weight_loss": 0.80,       # 20% deficit
    "muscle_gain": 1.15,       # 15% surplus
    "heart_health": 0.95,      # slight deficit
    "diabetic_friendly": 0.90, # 10% deficit
    "maintenance": 1.0,
}


@dataclass
class NutritionTargets:
    """Computed daily nutrition targets for a user."""
    bmr: float
    tdee: float
    calorie_target: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int


def calculate_bmr(weight_kg: float, height_cm: int, age: int, gender: str) -> float:
    """Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.

    Men:   BMR = (10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5
    Women: BMR = (10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161
    """
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender.lower() in ("male", "m"):
        return base + 5
    return base - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Calculate Total Daily Energy Expenditure from BMR and activity level."""
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["moderate"])
    return bmr * multiplier


def compute_nutrition_targets(
    weight_kg: float,
    height_cm: int,
    age: int,
    gender: str,
    activity_level: str = "moderate",
    health_goal: str = "general_health",
) -> NutritionTargets:
    """Compute full daily nutrition targets for a user.

    Returns BMR, TDEE, calorie target (adjusted for goal), and macros.
    """
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)

    adjustment = CALORIE_ADJUSTMENTS.get(health_goal, 1.0)
    calorie_target = round(tdee * adjustment)

    protein_pct, carbs_pct, fat_pct = MACRO_SPLITS.get(
        health_goal, MACRO_SPLITS["general_health"]
    )

    # 1g protein = 4 cal, 1g carbs = 4 cal, 1g fat = 9 cal
    protein_g = round((calorie_target * protein_pct) / 4)
    carbs_g = round((calorie_target * carbs_pct) / 4)
    fat_g = round((calorie_target * fat_pct) / 9)

    # Fiber target: ~14g per 1000 kcal (IOM recommendation)
    fiber_g = round(calorie_target * 14 / 1000)

    targets = NutritionTargets(
        bmr=round(bmr, 1),
        tdee=round(tdee, 1),
        calorie_target=calorie_target,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        fiber_g=fiber_g,
    )

    logger.info(
        "Computed targets for %s/%s/%skg/%scm: BMR=%.0f TDEE=%.0f target=%d kcal",
        gender, activity_level, weight_kg, height_cm, bmr, tdee, calorie_target,
    )
    return targets


def get_user_targets(
    weight_kg: float | None,
    height_cm: int | None,
    age: int | None,
    gender: str | None,
    activity_level: str = "moderate",
    health_goal: str = "general_health",
    # Pre-computed overrides from DB
    calorie_target: int | None = None,
    protein_target_g: int | None = None,
    carb_target_g: int | None = None,
    fat_target_g: int | None = None,
    fiber_target_g: int | None = None,
) -> NutritionTargets:
    """Get nutrition targets -- use DB overrides if available, else compute."""
    # If user has pre-set targets in DB, use those
    if calorie_target and protein_target_g:
        return NutritionTargets(
            bmr=0,
            tdee=0,
            calorie_target=calorie_target,
            protein_g=protein_target_g,
            carbs_g=carb_target_g or 250,
            fat_g=fat_target_g or 65,
            fiber_g=fiber_target_g or 30,
        )

    # Compute from body measurements if available
    if weight_kg and height_cm and age and gender:
        return compute_nutrition_targets(
            weight_kg=weight_kg,
            height_cm=height_cm,
            age=age,
            gender=gender,
            activity_level=activity_level,
            health_goal=health_goal,
        )

    # Fallback: sensible Indian adult defaults
    logger.warning("Insufficient user data for nutrition calc; using defaults")
    return NutritionTargets(
        bmr=1500,
        tdee=2000,
        calorie_target=2000,
        protein_g=75,
        carbs_g=250,
        fat_g=65,
        fiber_g=30,
    )
