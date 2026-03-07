"""Pydantic models for all request/response schemas in the Meal Engine service."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"


class DietType(str, Enum):
    vegetarian = "vegetarian"
    vegan = "vegan"
    eggetarian = "eggetarian"
    non_vegetarian = "non_vegetarian"
    pescatarian = "pescatarian"


class HealthGoal(str, Enum):
    general_health = "general_health"
    weight_loss = "weight_loss"
    muscle_gain = "muscle_gain"
    heart_health = "heart_health"
    diabetic_friendly = "diabetic_friendly"
    maintenance = "maintenance"


class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class PlanStatus(str, Enum):
    generated = "generated"
    accepted = "accepted"
    partially_ordered = "partially_ordered"
    ordered = "ordered"


# ---------------------------------------------------------------------------
# Nutrition
# ---------------------------------------------------------------------------

class NutritionInfo(BaseModel):
    calories: int = Field(..., ge=0, description="Total calories (kcal)")
    protein_g: float = Field(..., ge=0, description="Protein in grams")
    carbs_g: float = Field(..., ge=0, description="Carbohydrates in grams")
    fat_g: float = Field(..., ge=0, description="Fat in grams")
    fiber_g: float = Field(0, ge=0, description="Fiber in grams")


# ---------------------------------------------------------------------------
# Ingredient
# ---------------------------------------------------------------------------

class Ingredient(BaseModel):
    name: str = Field(..., description="Ingredient name")
    quantity: str = Field(..., description="Quantity with unit, e.g. '200g', '2 cups'")
    category: str = Field("other", description="Category: vegetable, protein, grain, dairy, spice, other")
    is_available: bool = Field(False, description="Whether ingredient is available in pantry")
    search_term: str = Field("", description="Optimized search term for grocery platforms")


# ---------------------------------------------------------------------------
# Recipe / Meal
# ---------------------------------------------------------------------------

class MealRecipe(BaseModel):
    name: str = Field(..., description="Recipe name")
    cuisine: str = Field(..., description="Cuisine type: north_indian, south_indian, mediterranean, asian, etc.")
    meal_type: MealType
    diet_type: DietType
    description: str = Field("", description="Short description")
    prep_time_min: int = Field(15, ge=0)
    cook_time_min: int = Field(20, ge=0)
    servings: int = Field(2, ge=1)
    ingredients: list[Ingredient] = Field(default_factory=list)
    instructions_user: list[str] = Field(default_factory=list, description="Instructions for self-cooking")
    instructions_cook: list[str] = Field(default_factory=list, description="Simple Hindi-style instructions for cook")
    nutrition: NutritionInfo
    tags: list[str] = Field(default_factory=list)
    difficulty: str = Field("easy")


# ---------------------------------------------------------------------------
# Meal Plan
# ---------------------------------------------------------------------------

class MealPlanMeals(BaseModel):
    breakfast: MealRecipe
    lunch: MealRecipe
    dinner: MealRecipe


class GroceryItem(BaseModel):
    ingredient: str
    quantity: str
    search_term: str = ""
    estimated_price_inr: float = Field(0, ge=0)


class MealPlanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_date: date
    meals: MealPlanMeals
    daily_totals: NutritionInfo
    grocery_list: list[GroceryItem] = Field(default_factory=list)
    status: PlanStatus = PlanStatus.generated
    created_at: datetime


class MealPlanHistoryItem(BaseModel):
    id: uuid.UUID
    plan_date: date
    meals: MealPlanMeals
    daily_totals: NutritionInfo | None = None
    status: PlanStatus
    created_at: datetime


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------

class GeneratePlanRequest(BaseModel):
    plan_date: date | None = Field(None, description="Date for the plan. Defaults to today.")
    preferences: dict | None = Field(None, description="Optional overrides for this generation")


class SwapMealRequest(BaseModel):
    reason: str = Field("", description="Why the user wants to swap")
    preferences: dict | None = Field(None, description="Optional constraints for replacement")


class FeedbackRequest(BaseModel):
    meal_type: MealType
    rating: int = Field(..., ge=1, le=5)
    feedback_text: str = Field("", max_length=1000)
    tags: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class FeedbackResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    meal_plan_id: uuid.UUID
    meal_type: MealType
    rating: int
    feedback_text: str
    tags: list[str]
    created_at: datetime


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "meal-engine"
    version: str = "1.0.0"


# ---------------------------------------------------------------------------
# User profile (internal, loaded from DB)
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    id: uuid.UUID
    name: str | None = None
    email: str | None = None
    height_cm: int | None = None
    weight_kg: float | None = None
    age: int | None = None
    gender: str | None = None
    activity_level: str = "moderate"
    health_goal: str = "general_health"
    calorie_target: int | None = None
    protein_target_g: int | None = None
    fiber_target_g: int | None = None
    carb_target_g: int | None = None
    fat_target_g: int | None = None
    diet_type: str = "vegetarian"
    cuisine_preferences: list[str] = Field(default_factory=lambda: ["indian"])
    allergies: list[str] = Field(default_factory=list)
    ingredient_blacklist: list[str] = Field(default_factory=list)
    breakfast_style: str = "quick_easy"
    lunch_style: str = "full_meal"
    dinner_style: str = "mixed"
    has_cook: bool = False
    cook_skill_level: str = "basic"
    preferred_platform: str = "swiggy"


# ---------------------------------------------------------------------------
# Pantry state (from Pantry Tracker service)
# ---------------------------------------------------------------------------

class PantryItem(BaseModel):
    ingredient_name: str
    category: str = "other"
    estimated_servings_remaining: int = 0
    status: str = "unknown"
    needs_reorder: bool = False


class PantryState(BaseModel):
    items: list[PantryItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Claude AI response schema
# ---------------------------------------------------------------------------

class ClaudeMealPlanResponse(BaseModel):
    """Schema the Claude API must conform to when generating a meal plan."""
    meals: MealPlanMeals
    daily_totals: NutritionInfo
    grocery_list: list[GroceryItem] = Field(default_factory=list)
    notes: str = Field("", description="Any notes for the user about the plan")
