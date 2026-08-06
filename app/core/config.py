from pydantic_settings import BaseSettings, SettingsConfigDict
from zoneinfo import ZoneInfo

class Settings(BaseSettings):
    PROJECT_NAME: str = "APOLODIGITAL BARBER - Backend SaaS"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    # Pydantic v2: Carga automáticamente el archivo .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()