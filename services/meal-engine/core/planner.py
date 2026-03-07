"""Main planning orchestrator that coordinates meal plan generation."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import date, datetime, timedelta
from typing import Any

import httpx
import redis.asyncio as redis

from ai.claude_client import claude_client
from ai.prompts.meal_plan import MEAL_PLAN_SYSTEM_PROMPT, build_meal_plan_user_prompt
from ai.prompts.substitution import SUBSTITUTION_SYSTEM_PROMPT, build_substitution_user_prompt
from ai.response_parser import parse_meal_plan_response, parse_substitution_response
from config import settings
from core.cuisine_rotator import get_cuisine_constraints, get_seasonal_suggestions, validate_plan_rotation
from core.nutrition import get_user_targets
from models.schemas import (
    ClaudeMealPlanResponse,
    MealPlanMeals,
    MealPlanResponse,
    MealType,
    NutritionInfo,
    PantryState,
    PlanStatus,
    UserProfile,
)

logger = logging.getLogger(__name__)


class MealPlanner:
    """Orchestrates the full meal plan generation pipeline."""

    def __init__(self, db, redis_client: redis.Redis | None = None) -> None:
        self._db = db
        self._redis = redis_client
        self._http = httpx.AsyncClient(timeout=15.0)

    async def close(self) -> None:
        await self._http.aclose()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_plan(
        self,
        user_id: uuid.UUID,
        plan_date: date | None = None,
        preferences: dict | None = None,
    ) -> MealPlanResponse:
        """Full pipeline: load context -> call Claude -> validate -> store -> publish."""
        target_date = plan_date or date.today()
        logger.info("Generating meal plan for user=%s date=%s", user_id, target_date)

        # 1. Load user profile
        user_profile = await self._load_user_profile(user_id)

        # 2. Compute nutrition targets
        targets = get_user_targets(
            weight_kg=user_profile.weight_kg,
            height_cm=user_profile.height_cm,
            age=user_profile.age,
            gender=user_profile.gender,
            activity_level=user_profile.activity_level,
            health_goal=user_profile.health_goal,
            calorie_target=user_profile.calorie_target,
            protein_target_g=user_profile.protein_target_g,
            carb_target_g=user_profile.carb_target_g,
            fat_target_g=user_profile.fat_target_g,
            fiber_target_g=user_profile.fiber_target_g,
        )

        # 3. Get pantry state from Pantry Tracker service
        pantry_items = await self._fetch_pantry_state(user_id)

        # 4. Get recent meal history (7 days)
        recent_plans = await self._get_recent_plans(user_id, days=7)

        # 5. Compute cuisine rotation constraints
        cuisine_constraints = get_cuisine_constraints(recent_plans)

        # 6. Seasonal ingredients
        seasonal = get_seasonal_suggestions(target_date)

        # 7. Build prompt and call Claude
        user_prompt = build_meal_plan_user_prompt(
            user_profile=user_profile.model_dump(),
            nutrition_targets={
                "calorie_target": targets.calorie_target,
                "protein_g": targets.protein_g,
                "carbs_g": targets.carbs_g,
                "fat_g": targets.fat_g,
                "fiber_g": targets.fiber_g,
            },
            pantry_items=pantry_items,
            cuisine_constraints=cuisine_constraints,
            seasonal_ingredients=seasonal,
            meal_styles={
                "breakfast_style": user_profile.breakfast_style,
                "lunch_style": user_profile.lunch_style,
                "dinner_style": user_profile.dinner_style,
            },
            plan_date=str(target_date),
        )

        raw_response = await claude_client.generate_json(
            system_prompt=MEAL_PLAN_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )

        # 8. Parse and validate
        parsed = parse_meal_plan_response(raw_response)

        # 9. Check rotation (warn but don't block)
        rotation_warnings = validate_plan_rotation(parsed.meals, recent_plans)
        if rotation_warnings:
            logger.warning("Rotation warnings (non-blocking): %s", rotation_warnings)

        # 10. Store in DB
        plan_id = await self._store_plan(user_id, target_date, parsed)

        # 11. Publish event to Redis stream
        await self._publish_event(user_id, plan_id, target_date)

        now = datetime.utcnow()
        return MealPlanResponse(
            id=plan_id,
            user_id=user_id,
            plan_date=target_date,
            meals=parsed.meals,
            daily_totals=parsed.daily_totals,
            grocery_list=parsed.grocery_list,
            status=PlanStatus.generated,
            created_at=now,
        )

    async def swap_meal(
        self,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        meal_type: str,
        reason: str = "",
        preferences: dict | None = None,
    ) -> MealPlanResponse:
        """Swap a single meal in an existing plan by regenerating just that meal."""
        # Load current plan
        plan = await self._get_plan_by_id(plan_id, user_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found for user {user_id}")

        user_profile = await self._load_user_profile(user_id)
        pantry_items = await self._fetch_pantry_state(user_id)
        recent_plans = await self._get_recent_plans(user_id, days=7)
        cuisine_constraints = get_cuisine_constraints(recent_plans)

        # Build a targeted prompt for just one meal
        current_meals = plan["meals"]
        current_meal = current_meals.get(meal_type, {})

        swap_prompt = (
            f"I need to swap the {meal_type} in my meal plan.\n"
            f"Current {meal_type}: {current_meal.get('name', 'Unknown')}\n"
            f"Reason for swap: {reason or 'User preference'}\n\n"
            f"Generate a COMPLETE meal plan JSON but only change the {meal_type}. "
            f"Keep the other meals exactly the same.\n\n"
            f"Current plan:\n{json.dumps(current_meals, indent=2)}\n\n"
            f"User diet: {user_profile.diet_type}\n"
            f"Available pantry: {', '.join(pantry_items[:20])}\n"
            f"Avoid cuisines: {', '.join(cuisine_constraints.get('avoid_cuisines', []))}\n"
            f"Preferred cuisines: {', '.join(cuisine_constraints.get('preferred_cuisines', []))}\n\n"
            f"Output ONLY valid JSON matching the meal plan schema."
        )

        raw_response = await claude_client.generate_json(
            system_prompt=MEAL_PLAN_SYSTEM_PROMPT,
            user_prompt=swap_prompt,
        )

        parsed = parse_meal_plan_response(raw_response)

        # Update in DB
        await self._update_plan_meals(plan_id, parsed)

        return MealPlanResponse(
            id=plan_id,
            user_id=user_id,
            plan_date=plan["plan_date"],
            meals=parsed.meals,
            daily_totals=parsed.daily_totals,
            grocery_list=parsed.grocery_list,
            status=PlanStatus(plan.get("status", "generated")),
            created_at=plan["created_at"],
        )

    async def get_today_plan(self, user_id: uuid.UUID) -> MealPlanResponse | None:
        """Get today's meal plan for a user."""
        today = date.today()
        query = """
            SELECT id, user_id, plan_date, meals, daily_totals, grocery_list, status, created_at
            FROM meals.meal_plans
            WHERE user_id = :user_id AND plan_date = :plan_date
        """
        row = await self._db.fetch_one(query=query, values={"user_id": str(user_id), "plan_date": today})
        if not row:
            return None
        return self._row_to_response(row)

    async def get_history(self, user_id: uuid.UUID, days: int = 30) -> list[dict]:
        """Get meal plan history for the last N days."""
        since = date.today() - timedelta(days=days)
        query = """
            SELECT id, user_id, plan_date, meals, daily_totals, grocery_list, status, created_at
            FROM meals.meal_plans
            WHERE user_id = :user_id AND plan_date >= :since
            ORDER BY plan_date DESC
        """
        rows = await self._db.fetch_all(query=query, values={"user_id": str(user_id), "since": since})
        return [self._row_to_dict(row) for row in rows]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _load_user_profile(self, user_id: uuid.UUID) -> UserProfile:
        """Load user profile from the database."""
        query = """
            SELECT id, name, email, height_cm, weight_kg, age, gender,
                   activity_level, health_goal,
                   calorie_target, protein_target_g, fiber_target_g, carb_target_g, fat_target_g,
                   diet_type, cuisine_preferences, allergies, ingredient_blacklist,
                   breakfast_style, lunch_style, dinner_style,
                   has_cook, cook_skill_level, preferred_platform
            FROM auth.users
            WHERE id = :user_id
        """
        row = await self._db.fetch_one(query=query, values={"user_id": str(user_id)})
        if not row:
            raise ValueError(f"User {user_id} not found")

        row_dict = dict(row._mapping)
        # Handle PostgreSQL array fields
        for field in ("cuisine_preferences", "allergies", "ingredient_blacklist"):
            val = row_dict.get(field)
            if val is None:
                row_dict[field] = []
            elif isinstance(val, str):
                row_dict[field] = [v.strip() for v in val.strip("{}").split(",") if v.strip()]

        return UserProfile(**row_dict)

    async def _fetch_pantry_state(self, user_id: uuid.UUID) -> list[str]:
        """Fetch pantry state from the Pantry Tracker service via HTTP."""
        try:
            url = f"{settings.pantry_tracker_url}/api/v1/pantry"
            response = await self._http.get(url, headers={"X-User-Id": str(user_id)})
            response.raise_for_status()
            data = response.json()

            # Extract ingredient names from stocked items
            items = data.get("stocked", data.get("items", []))
            available = [
                item["ingredient_name"]
                for item in items
                if item.get("estimated_servings_remaining", 0) > 0
                or item.get("status") in ("in_stock", "stocked")
            ]
            logger.info("Fetched %d available pantry items for user %s", len(available), user_id)
            return available

        except httpx.HTTPError as exc:
            logger.warning(
                "Failed to fetch pantry state for user %s: %s. Proceeding without pantry data.",
                user_id, str(exc)[:200],
            )
            return []

    async def _get_recent_plans(self, user_id: uuid.UUID, days: int = 7) -> list[dict]:
        """Get recent meal plans from the database."""
        since = date.today() - timedelta(days=days)
        query = """
            SELECT id, plan_date, meals, status
            FROM meals.meal_plans
            WHERE user_id = :user_id AND plan_date >= :since
            ORDER BY plan_date DESC
        """
        rows = await self._db.fetch_all(
            query=query,
            values={"user_id": str(user_id), "since": since},
        )
        results = []
        for row in rows:
            row_dict = dict(row._mapping)
            meals = row_dict.get("meals")
            if isinstance(meals, str):
                meals = json.loads(meals)
            row_dict["meals"] = meals if isinstance(meals, dict) else {}
            results.append(row_dict)
        return results

    async def _get_plan_by_id(self, plan_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
        """Load a specific meal plan."""
        query = """
            SELECT id, user_id, plan_date, meals, daily_totals, grocery_list, status, created_at
            FROM meals.meal_plans
            WHERE id = :plan_id AND user_id = :user_id
        """
        row = await self._db.fetch_one(
            query=query,
            values={"plan_id": str(plan_id), "user_id": str(user_id)},
        )
        if not row:
            return None
        return self._row_to_dict(row)

    async def _store_plan(
        self,
        user_id: uuid.UUID,
        plan_date: date,
        parsed: ClaudeMealPlanResponse,
    ) -> uuid.UUID:
        """Store or upsert a meal plan in the database."""
        plan_id = uuid.uuid4()
        meals_json = parsed.meals.model_dump(mode="json")
        totals_json = parsed.daily_totals.model_dump(mode="json")
        grocery_json = [g.model_dump(mode="json") for g in parsed.grocery_list]

        query = """
            INSERT INTO meals.meal_plans (id, user_id, plan_date, meals, daily_totals, grocery_list, status)
            VALUES (:id, :user_id, :plan_date, :meals, :daily_totals, :grocery_list, 'generated')
            ON CONFLICT (user_id, plan_date) DO UPDATE SET
                meals = EXCLUDED.meals,
                daily_totals = EXCLUDED.daily_totals,
                grocery_list = EXCLUDED.grocery_list,
                status = 'generated',
                created_at = NOW()
            RETURNING id
        """
        result = await self._db.fetch_one(
            query=query,
            values={
                "id": str(plan_id),
                "user_id": str(user_id),
                "plan_date": plan_date,
                "meals": json.dumps(meals_json),
                "daily_totals": json.dumps(totals_json),
                "grocery_list": json.dumps(grocery_json),
            },
        )
        returned_id = result._mapping["id"] if result else plan_id
        if isinstance(returned_id, str):
            returned_id = uuid.UUID(returned_id)
        logger.info("Stored meal plan %s for user %s on %s", returned_id, user_id, plan_date)
        return returned_id

    async def _update_plan_meals(
        self,
        plan_id: uuid.UUID,
        parsed: ClaudeMealPlanResponse,
    ) -> None:
        """Update meals in an existing plan (for swap)."""
        meals_json = parsed.meals.model_dump(mode="json")
        totals_json = parsed.daily_totals.model_dump(mode="json")
        grocery_json = [g.model_dump(mode="json") for g in parsed.grocery_list]

        query = """
            UPDATE meals.meal_plans
            SET meals = :meals, daily_totals = :daily_totals, grocery_list = :grocery_list
            WHERE id = :plan_id
        """
        await self._db.execute(
            query=query,
            values={
                "plan_id": str(plan_id),
                "meals": json.dumps(meals_json),
                "daily_totals": json.dumps(totals_json),
                "grocery_list": json.dumps(grocery_json),
            },
        )

    async def _publish_event(
        self,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        plan_date: date,
    ) -> None:
        """Publish a plan.generated event to the Redis stream."""
        if not self._redis:
            logger.debug("Redis not available; skipping event publish")
            return

        try:
            event = {
                "event_type": "plan.generated",
                "user_id": str(user_id),
                "plan_id": str(plan_id),
                "plan_date": str(plan_date),
                "timestamp": datetime.utcnow().isoformat(),
            }
            await self._redis.xadd(settings.redis_stream, event)
            logger.info("Published plan.generated event for plan %s", plan_id)
        except Exception as exc:
            logger.error("Failed to publish event to Redis: %s", str(exc)[:200])

    @staticmethod
    def _row_to_dict(row) -> dict:
        """Convert a database row to a plain dict with parsed JSON fields."""
        d = dict(row._mapping)
        for json_field in ("meals", "daily_totals", "grocery_list"):
            val = d.get(json_field)
            if isinstance(val, str):
                d[json_field] = json.loads(val)
        return d

    @staticmethod
    def _row_to_response(row) -> MealPlanResponse:
        """Convert a database row to a MealPlanResponse."""
        d = dict(row._mapping)
        for json_field in ("meals", "daily_totals", "grocery_list"):
            val = d.get(json_field)
            if isinstance(val, str):
                d[json_field] = json.loads(val)

        meals_data = d.get("meals", {})
        totals_data = d.get("daily_totals") or {}
        grocery_data = d.get("grocery_list") or []

        return MealPlanResponse(
            id=d["id"] if isinstance(d["id"], uuid.UUID) else uuid.UUID(d["id"]),
            user_id=d["user_id"] if isinstance(d["user_id"], uuid.UUID) else uuid.UUID(d["user_id"]),
            plan_date=d["plan_date"],
            meals=MealPlanMeals(**meals_data),
            daily_totals=NutritionInfo(**totals_data) if totals_data else NutritionInfo(
                calories=0, protein_g=0, carbs_g=0, fat_g=0, fiber_g=0
            ),
            grocery_list=grocery_data,
            status=PlanStatus(d.get("status", "generated")),
            created_at=d["created_at"],
        )
