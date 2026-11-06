"""Production-only same-origin frontend hosting and bounded public API requests."""
from collections import deque
import math
from time import monotonic
from pathlib import Path

from fastapi import HTTPException
from starlette.datastructures import Headers, MutableHeaders
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import FileResponse, JSONResponse
from starlette.staticfiles import StaticFiles

from backend.app.config import get_settings


class PublicAPIProtection:
    """Per-process global budgets: deliberately independent of untrusted IP headers.

    Render's free deployment runs one worker. This bounds application request rates,
    not distributed denial-of-service traffic; Render still handles the network edge.
    """
    def __init__(self, app, *, api_limit=600, simulation_limit=120, max_body=32768):
        self.app = app
        self.api_limit = api_limit
        self.simulation_limit = simulation_limit
        self.max_body = max_body
        self.requests = deque()
        self.simulations = deque()

    @staticmethod
    def retry_after(queue, limit, now):
        while queue and queue[0] <= now - 60:
            queue.popleft()
        if limit and len(queue) >= limit:
            return max(1, math.ceil(60 - (now - queue[0])))
        return 0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def secure_send(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
                headers["Content-Security-Policy"] = (
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https://tile.openstreetmap.org; font-src 'self'; "
                    "connect-src 'self'; object-src 'none'; base-uri 'self'; "
                    "form-action 'self'; frame-ancestors 'none'"
                )
            await send(message)

        path = scope["path"]
        if path.startswith("/api/") and not path.startswith("/api/v1/health/"):
            now = monotonic()
            retry = self.retry_after(self.requests, self.api_limit, now)
            simulation = path == "/api/v1/simulations" and scope["method"] == "POST"
            if simulation:
                retry = max(retry, self.retry_after(self.simulations, self.simulation_limit, now))
            if retry:
                response = JSONResponse(
                    {"detail": {"code": "rate_limit", "message": "Previše zahtjeva. Pokušajte ponovno za nekoliko trenutaka."}},
                    status_code=429, headers={"Retry-After": str(retry)},
                )
                return await response(scope, receive, secure_send)
            if self.api_limit:
                self.requests.append(now)
            if simulation and self.simulation_limit:
                self.simulations.append(now)

        if scope["method"] in ("POST", "PUT", "PATCH"):
            headers = Headers(scope=scope)
            try:
                length = int(headers.get("content-length", "0"))
            except ValueError:
                return await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, secure_send)
            if length < 0:
                return await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, secure_send)
            body = bytearray()
            if length <= self.max_body:
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    body.extend(message.get("body", b""))
                    if len(body) > self.max_body or not message.get("more_body", False):
                        break
            if length > self.max_body or len(body) > self.max_body:
                return await JSONResponse({"detail": "Request body too large"}, status_code=413)(scope, receive, secure_send)
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            return await self.app(scope, bounded_receive, secure_send)
        return await self.app(scope, receive, secure_send)


def configure_production(app, settings):
    static = settings.static_dir.resolve()
    if not (static / "index.html").is_file():
        raise RuntimeError("Built frontend is missing. Build deploy/Dockerfile.render.")
    hostname = settings.render_external_hostname
    if settings.environment == "production" and not hostname:
        raise RuntimeError("RENDER_EXTERNAL_HOSTNAME is required for the production service.")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[hostname or "testserver", "localhost", "127.0.0.1"])
    app.add_middleware(
        PublicAPIProtection,
        api_limit=settings.api_requests_per_minute,
        simulation_limit=settings.simulations_per_minute,
        max_body=settings.max_request_body_bytes,
    )
    app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        # No filesystem path concatenation from the URL, and no SPA fallback for API errors.
        if path.split("/", 1)[0] == "api":
            raise HTTPException(404)
        if path in ("", "explorer", "compare", "simulator", "guide"):
            return FileResponse(static / "index.html", headers={"Cache-Control": "no-cache"})
        candidate = (static / path).resolve()
        if candidate.is_relative_to(static) and candidate.is_file() and not any(p.startswith(".") for p in Path(path).parts):
            return FileResponse(candidate)
        raise HTTPException(404)
    return app


def create_app():
    from backend.app.main import app
    return configure_production(app, get_settings())
