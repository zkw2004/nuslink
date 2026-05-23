from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str = ""
    supabase_service_key: str = ""
    allowed_origins: list[str] = ["http://localhost:8081", "exp://localhost:8081"]
    app_version: str = "0.1.0"


settings = Settings()
