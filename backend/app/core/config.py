from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_key: str = ""
    allowed_origins: list[str] = ["http://localhost:8081", "exp://localhost:8081"]
    app_version: str = "0.1.0"
    expo_push_access_token: str = ""
    push_worker_enabled: bool = True
    push_worker_interval_seconds: float = 10.0
    anthropic_api_key: str = ""
    anthropic_group_drafting_model: str = "claude-haiku-4-5-20251001"
    anthropic_model: str = "claude-haiku-4-5-20251001"
    anthropic_moderation_model: str = "claude-haiku-4-5-20251001"
    anthropic_profile_extraction_model: str = "claude-haiku-4-5-20251001"


settings = Settings()
