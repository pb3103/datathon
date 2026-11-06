from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    environment: Literal["development", "production"] = "development"
    database_url: str = Field(
        default="postgresql+psycopg://wastewise:wastewise_local@localhost:5433/wastewise",
        repr=False,
    )
    cors_origins: list[str] = ["http://localhost:5173"]
    data_dir: Path = Path("podaci")
    static_dir: Path = Path("static")
    render_external_hostname: str | None = None
    database_read_only: bool = False
    db_statement_timeout_ms: int = Field(default=15000, ge=1000, le=120000)
    api_requests_per_minute: int = Field(default=0, ge=0, le=100000)
    simulations_per_minute: int = Field(default=0, ge=0, le=100000)
    max_request_body_bytes: int = Field(default=32768, ge=1024, le=1048576)

    @field_validator("database_url", mode="before")
    @classmethod
    def use_psycopg(cls, value: str) -> str:
        # Render supplies postgresql://, while this project installs psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @model_validator(mode="after")
    def production_configuration(self):
        if self.environment == "production":
            from sqlalchemy.engine import make_url
            url = make_url(self.database_url)
            if not url.drivername.startswith("postgresql") or url.host in (None, "localhost", "127.0.0.1"):
                raise ValueError("Production requires an explicitly configured PostgreSQL database.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
