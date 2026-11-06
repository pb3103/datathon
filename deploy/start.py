"""Migrate and seed a fresh Render database, then serve the application read-only.

Free web services have no pre-deploy command. Checked, idempotent imports run at
startup; completed sources are never duplicated and revisions are not auto-activated.
"""
import os
from pathlib import Path
import subprocess
import sys
import time


def initialize():
    # Only this short-lived bootstrap process needs database writes.
    os.environ["DATABASE_READ_ONLY"] = "false"
    from sqlalchemy import func, select, text
    from sqlalchemy.exc import OperationalError
    from alembic import command
    from alembic.config import Config
    from backend.app.db import get_engine
    from backend.app.models import MaterialObservation, WasteObservation

    engine = get_engine()
    for attempt in range(30):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            break
        except OperationalError:
            if attempt == 29:
                raise RuntimeError("Database is not reachable; check Render's internal connection settings.") from None
            print("Waiting for database…", flush=True)
            time.sleep(2)

    # Session-level lock also serializes migrations across overlapping deploys.
    with engine.connect() as lock:
        lock.execute(text("SET statement_timeout = 120000"))
        lock.execute(text("SELECT pg_advisory_lock(8703292027)"))
        try:
            command.upgrade(Config(str(Path("backend/alembic.ini"))), "head")
            for module in ("pipeline.import_data", "pipeline.historical", "pipeline.materials"):
                print(f"Verifying and importing {module}…", flush=True)
                subprocess.run([sys.executable, "-m", module], check=True)
            with engine.connect() as connection:
                core = dict(connection.execute(
                    select(WasteObservation.year, func.count()).where(WasteObservation.active).group_by(WasteObservation.year)
                ).all())
                materials = dict(connection.execute(
                    select(MaterialObservation.year, func.count()).where(MaterialObservation.active).group_by(MaterialObservation.year)
                ).all())
                if any(core.get(year) != 556 for year in range(2017, 2025)):
                    raise RuntimeError("Incomplete municipality data: refusing to serve a partial deployment.")
                if any(materials.get(year) != 556 * 7 for year in range(2021, 2025)):
                    raise RuntimeError("Incomplete material data: refusing to serve a partial deployment.")
            print("Verified 4,448 annual observations and 15,568 material observations.", flush=True)
        finally:
            lock.execute(text("SELECT pg_advisory_unlock(8703292027)"))
            lock.commit()
    engine.dispose()


def main():
    initialize()
    # A new Python process reads this before constructing the runtime connection pool.
    os.environ["DATABASE_READ_ONLY"] = "true"
    port = int(os.environ.get("PORT", "10000"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT must be a valid TCP port.")
    os.execvp(sys.executable, [
        sys.executable, "-m", "uvicorn", "backend.app.production:create_app", "--factory",
        "--host", "0.0.0.0", "--port", str(port), "--workers", "1",
        "--no-server-header", "--no-proxy-headers", "--limit-concurrency", "40",
        "--timeout-keep-alive", "5",
    ])


if __name__ == "__main__":
    main()
