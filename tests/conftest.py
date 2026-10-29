"""Integration tests use disposable PostgreSQL schemas, never SQLite/public cleanup."""

import uuid
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from backend.app.config import get_settings
from pipeline.extract import ROOT, load_sources


@pytest.fixture(scope="session")
def extracted_sources():
    return load_sources(get_settings().data_dir, ROOT / "data/manifests/source_files.json")


@pytest.fixture
def pg_engine(monkeypatch):
    import backend.app.db as db

    schema = "test_" + uuid.uuid4().hex
    admin = create_engine(get_settings().database_url)
    with admin.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA {schema}"))
    engine = create_engine(
        get_settings().database_url, connect_args={"options": f"-csearch_path={schema}"}
    )
    monkeypatch.setattr(db, "get_engine", lambda: engine)
    cfg = Config(str(ROOT / "backend/alembic.ini"))
    command.upgrade(cfg, "head")
    try:
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as conn:
            conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
        admin.dispose()


@pytest.fixture
def seeded_engine(pg_engine, extracted_sources):
    from pipeline.import_data import import_source

    for entry, rows in extracted_sources:
        result = import_source(pg_engine, entry, rows)
        assert result["status"] == "completed"
    return pg_engine


@pytest.fixture
def client(seeded_engine):
    from sqlalchemy.orm import Session
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.db import get_session

    def sessions():
        with Session(seeded_engine) as session:
            yield session

    app.dependency_overrides[get_session] = sessions
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
