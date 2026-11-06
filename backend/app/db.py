from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.app.config import get_settings


@lru_cache
def get_engine():
    settings = get_settings()
    options = f"-c statement_timeout={settings.db_statement_timeout_ms}"
    if settings.database_read_only:
        options += " -c default_transaction_read_only=on"
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=10,
        connect_args={"connect_timeout": 5, "options": options},
    )


def get_session():
    with Session(get_engine()) as session:
        yield session
