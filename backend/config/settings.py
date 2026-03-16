from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "World Monitor"
    app_version: str = "1.0.0"
    app_env: str = "development"

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Google Gemini / LangChain
    google_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"

    # Ollama / AI Brief
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout: int = 90
    ollama_num_predict: int = 1024

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Location extraction
    spacy_model: str = "en_core_web_sm"
    geopy_timeout: int = 5

    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_prefix="APP_",
        case_sensitive=False,
        extra="ignore",
    )


# Separate class — DATABASE_URL has no APP_ prefix in .env
class DatabaseSettings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app_user:app_pass@localhost:5432/app_db"

    model_config = SettingsConfigDict(
        env_file=(".env",),
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
db_settings = DatabaseSettings()
