"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Pantry Tracker service configuration."""

    # Application
    app_name: str = "pantry-tracker"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql://localhost:5432/mealmate"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    pantry_cache_ttl_seconds: int = 3600  # 1 hour

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "case_sensitive": False}


settings = Settings()
