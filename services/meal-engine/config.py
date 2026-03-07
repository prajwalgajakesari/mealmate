"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for the Meal Engine service."""

    # --- Application ---
    app_name: str = "MealMate Meal Engine"
    debug: bool = False
    log_level: str = "INFO"

    # --- Database ---
    database_url: str = "postgresql://mealmate:mealmate@localhost:5432/mealmate"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    redis_stream: str = "mealmate:events"

    # --- Anthropic / Claude ---
    anthropic_api_key: str = ""
    claude_model: str = "claude-haiku-4-5-20251001"
    claude_max_tokens: int = 8192
    claude_max_retries: int = 3

    # --- Inter-service communication ---
    pantry_tracker_url: str = "http://pantry-tracker:8000"

    # --- Auth ---
    user_id_header: str = "X-User-Id"

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
