from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # pydantic-settings reads these from environment variables or a .env file.
    # Variable names are case-insensitive.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS — must include the Next.js dev server origin
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Storage
    jobs_dir: str = "./jobs"

    # Logging
    log_level: str = "INFO"


# Module-level singleton — imported by the rest of the application
settings = Settings()
