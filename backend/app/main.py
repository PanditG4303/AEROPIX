"""AEROPIX FastAPI application entry point."""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db
from .routers import albums, auth, dashboard, images, system
from .services.storage import StorageError
from .utils.validators import ImageValidationError

logger = logging.getLogger("aeropix")


def configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    init_db()
    logger.info("AEROPIX %s starting", settings.app_version)
    logger.info("Environment: %s | Storage backend: %s", settings.environment, settings.storage_backend)
    if settings.storage_backend == "s3":
        logger.info(
            "Amazon S3 bucket: %s | region: %s",
            settings.aws_bucket_name or "(not configured)",
            settings.aws_region,
        )
    if settings.environment == "production" and settings.storage_backend == "local":
        logger.warning(
            "Local storage in production: files live on the EC2 volume. Set STORAGE_BACKEND=s3 for durable object storage."
        )
    yield
    logger.info("AEROPIX shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="AEROPIX API",
        description=(
            "Cloud-based image storage and gallery system. Metadata lives in SQLite; "
            "image binaries live in local storage (development) or private Amazon S3 (cloud)."
        ),
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        contact={"name": "AEROPIX"},
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        max_age=600,
    )
    if settings.hosts and settings.hosts != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.hosts)
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started) * 1000
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
        )
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        if settings.is_production:
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; "
                "img-src 'self' data: blob: https:; "
                "style-src 'self' 'unsafe-inline'; "
                "script-src 'self'; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            )
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        if duration_ms > 1500:
            logger.warning("Slow request: %s %s (%.0f ms)", request.method, request.url.path, duration_ms)
        return response

    @app.exception_handler(StorageError)
    async def storage_error_handler(_request: Request, exc: StorageError):
        logger.error("Storage error: %s", exc)
        return JSONResponse(
            status_code=getattr(exc, "status_code", 503),
            content={"detail": str(exc)},
        )

    @app.exception_handler(ImageValidationError)
    async def validation_error_handler(_request: Request, exc: ImageValidationError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc)},
        )

    app.include_router(system.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(images.router, prefix="/api")
    app.include_router(albums.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")

    @app.get("/api", include_in_schema=False)
    def api_root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/api/docs",
            "health": "/api/health",
        }

    dist = Path(settings.frontend_dist)
    index_file = dist / "index.html"
    if index_file.is_file():
        assets_dir = dist / "assets"
        if assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa_fallback(full_path: str):
            if full_path.startswith(("api/", "api")):
                return JSONResponse(status_code=404, content={"detail": "Not found."})
            if full_path:
                candidate = (dist / full_path).resolve()
                if candidate.is_file() and dist.resolve() in candidate.parents:
                    return FileResponse(candidate)
            return FileResponse(index_file, headers={"Cache-Control": "no-cache"})

        logger.info("Serving frontend build from %s", dist)
    else:

        @app.get("/", include_in_schema=False)
        def root():
            return {
                "name": "AEROPIX API",
                "message": "The API is running. Build the frontend or open the Vite dev server at http://localhost:5173.",
                "docs": "/api/docs",
                "frontend_expected_at": str(dist),
            }

    return app


app = create_app()
