"""Pydantic models for request/response schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums / Literals
# ---------------------------------------------------------------------------

IngredientCategory = str  # "fresh", "pantry", "staple"
ItemStatus = str  # "stocked", "low", "empty", "unknown"


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


class IngredientAmount(BaseModel):
    """An ingredient with the amount needed for a meal plan."""

    name: str = Field(..., examples=["paneer"])
    quantity_grams: float = Field(0.0, ge=0, examples=[200.0])


# ---------------------------------------------------------------------------
# Pantry Item
# ---------------------------------------------------------------------------


class PantryItemBase(BaseModel):
    ingredient_name: str = Field(..., max_length=255, examples=["toor dal"])
    category: str = Field(..., max_length=50, examples=["pantry"])
    last_ordered_qty: str | None = Field(None, max_length=50, examples=["1 kg"])
    estimated_servings_remaining: int = Field(0, ge=0)
    preferred_brand: str | None = Field(None, max_length=255)
    preferred_variant: str | None = Field(None, max_length=255)
    max_price: float | None = Field(None, ge=0)


class PantryItemCreate(PantryItemBase):
    """Request body to add a pantry item."""

    pass


class PantryItemUpdate(BaseModel):
    """Request body to update a pantry item."""

    ingredient_name: str | None = Field(None, max_length=255)
    category: str | None = Field(None, max_length=50)
    last_ordered_at: datetime | None = None
    last_ordered_qty: str | None = Field(None, max_length=50)
    estimated_servings_remaining: int | None = Field(None, ge=0)
    estimated_depletion_date: date | None = None
    avg_daily_usage_grams: float | None = Field(None, ge=0)
    avg_days_between_orders: int | None = Field(None, ge=0)
    times_ordered: int | None = Field(None, ge=0)
    preferred_brand: str | None = Field(None, max_length=255)
    preferred_variant: str | None = Field(None, max_length=255)
    max_price: float | None = Field(None, ge=0)
    status: str | None = Field(None, max_length=20)
    needs_reorder: bool | None = None


class PantryItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    ingredient_name: str
    category: str
    last_ordered_at: datetime | None = None
    last_ordered_qty: str | None = None
    estimated_servings_remaining: int
    estimated_depletion_date: date | None = None
    avg_daily_usage_grams: float | None = None
    avg_days_between_orders: int | None = None
    times_ordered: int
    preferred_brand: str | None = None
    preferred_variant: str | None = None
    max_price: float | None = None
    status: str
    needs_reorder: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Pantry State (grouped)
# ---------------------------------------------------------------------------


class PantryStateResponse(BaseModel):
    """Full pantry state grouped by status."""

    stocked: list[PantryItemResponse] = []
    low: list[PantryItemResponse] = []
    empty: list[PantryItemResponse] = []
    unknown: list[PantryItemResponse] = []
    total_items: int = 0


# ---------------------------------------------------------------------------
# Order Decision
# ---------------------------------------------------------------------------


class OrderDecision(BaseModel):
    """Decision on whether a single ingredient should be ordered."""

    ingredient_name: str
    category: str
    should_order: bool
    reason: str
    current_servings: int | None = None
    pantry_item_id: UUID | None = None


class CheckOrderRequest(BaseModel):
    """Request body for check-order endpoint."""

    ingredients: list[IngredientAmount]


class CheckOrderResponse(BaseModel):
    """Response with order decisions for each ingredient."""

    decisions: list[OrderDecision]
    total_to_order: int
    total_skipped: int


# ---------------------------------------------------------------------------
# Consume
# ---------------------------------------------------------------------------


class ConsumeRequest(BaseModel):
    """Request to deduct usage when a meal plan is executed."""

    meal_plan_id: UUID | None = None
    ingredients: list[IngredientAmount]


class ConsumeResponse(BaseModel):
    """Response after consuming ingredients."""

    updated_items: list[PantryItemResponse]
    not_found: list[str]


# ---------------------------------------------------------------------------
# After Order
# ---------------------------------------------------------------------------


class OrderedItem(BaseModel):
    """A single item that was ordered."""

    ingredient_name: str
    quantity: str = Field(..., examples=["1 kg"])
    quantity_grams: float = Field(..., ge=0, examples=[1000.0])
    servings: int = Field(..., ge=1, examples=[10])


class AfterOrderRequest(BaseModel):
    """Request to update pantry state after an order is placed."""

    items: list[OrderedItem]


class AfterOrderResponse(BaseModel):
    """Response after updating pantry post-order."""

    updated_items: list[PantryItemResponse]


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


class ReorderResponse(BaseModel):
    """Items that need reordering."""

    items: list[PantryItemResponse]
    count: int


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "pantry-tracker"
    version: str = "1.0.0"
    database: str = "unknown"
    redis: str = "unknown"
