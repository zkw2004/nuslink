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
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_moderation_model: str = "gemini-3.5-flash"
    gemini_profile_extraction_model: str = "gemini-3.5-flash"


settings = Settings()
