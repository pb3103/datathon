"""Production deployment contract; tests do not require a live Render account."""
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from backend.app.config import Settings
from backend.app.production import configure_production


def make_client(tmp_path, *, api_limit=0, simulation_limit=0, max_body=32768):
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<html>WasteWise</html>")
    (static / "assets/app.js").write_text("console.log('ok')")
    (tmp_path / "secret.txt").write_text("not public")
    app = FastAPI()

    @app.get("/api/v1/health/live")
    def health():
        return {"status": "ok"}

    @app.get("/api/v1/example")
    def example():
        return {"ok": True}

    @app.post("/api/v1/simulations")
    async def simulation():
        return {"ok": True}

    settings = SimpleNamespace(
        static_dir=static, environment="production", render_external_hostname="wastewise.onrender.com",
        api_requests_per_minute=api_limit, simulations_per_minute=simulation_limit,
        max_request_body_bytes=max_body,
    )
    return TestClient(configure_production(app, settings), base_url="https://wastewise.onrender.com")


@pytest.mark.parametrize("scheme", ["postgres://", "postgresql://", "postgresql+psycopg://"])
def test_render_database_url_uses_installed_driver(scheme):
    value = scheme + "user:p%40ss@internal-db/wastewise?sslmode=require"
    settings = Settings(_env_file=None, database_url=value)
    assert settings.database_url == "postgresql+psycopg://user:p%40ss@internal-db/wastewise?sslmode=require"
    assert "p%40ss" not in repr(settings)


def test_production_rejects_local_database_defaults():
    with pytest.raises(ValidationError, match="explicitly configured"):
        Settings(_env_file=None, environment="production", database_url="postgresql://user:password@localhost/db")


def test_static_routes_do_not_mask_api_errors_or_expose_files(tmp_path):
    with make_client(tmp_path) as client:
        for path in ("/", "/explorer?godina=2023", "/compare", "/simulator", "/guide"):
            response = client.get(path)
            assert response.status_code == 200
            assert response.headers["cache-control"] == "no-cache"
        assert client.get("/assets/app.js").status_code == 200
        assert client.get("/api/v1/not-found").status_code == 404
        assert client.get("/unknown-page").status_code == 404
        assert client.get("/..%2Fsecret.txt").status_code == 404
        assert client.get("/.env").status_code == 404
        assert client.get("/", headers={"Host": "untrusted.example"}).status_code == 400
        response = client.get("/")
        assert response.headers["x-content-type-options"] == "nosniff"
        assert "https://tile.openstreetmap.org" in response.headers["content-security-policy"]
        assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_rate_limits_exempt_health_checks(tmp_path):
    with make_client(tmp_path, api_limit=2) as client:
        for _ in range(4):
            assert client.get("/api/v1/health/live").status_code == 200
        assert client.get("/api/v1/example").status_code == 200
        assert client.get("/api/v1/example").status_code == 200
        response = client.get("/api/v1/example")
        assert response.status_code == 429
        assert 1 <= int(response.headers["retry-after"]) <= 60
        assert client.get("/").status_code == 200


def test_simulation_budget_is_separate(tmp_path):
    with make_client(tmp_path, api_limit=20, simulation_limit=1) as client:
        assert client.post("/api/v1/simulations", json={}).status_code == 200
        assert client.post("/api/v1/simulations", json={}).status_code == 429
        assert client.get("/api/v1/example").status_code == 200


def test_oversized_and_streamed_requests_rejected_before_handler(tmp_path):
    with make_client(tmp_path, max_body=1024) as client:
        assert client.post("/api/v1/simulations", content=b"x" * 1025).status_code == 413
        assert client.post("/api/v1/simulations", content=iter([b"x" * 600, b"x" * 600])).status_code == 413
        assert client.post("/api/v1/simulations", json={}).status_code == 200
