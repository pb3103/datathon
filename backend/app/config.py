from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://wastewise:wastewise_local@localhost:5433/wastewise"
    cors_origins: list[str] = ["http://localhost:5173"]
    data_dir: Path = Path("podaci")


@lru_cache
def get_settings() -> Settings:
    return Settings()
