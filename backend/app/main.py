"""FastAPI app entry point E.Practice.

Boot:
    uvicorn app.main:app --reload --port 8000

I router del modulo vengono registrati man mano che le rispettive fasi li
introducono (F5 — Endpoints REST). In F2 abbiamo solo:
- GET /api/health      health probe (per docker-compose, Render, browser)
- GET /                redirect informativo a /docs
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.config import Settings, get_settings
from app.constants import API_PREFIX, MODULE_NAME
from app.deps import get_settings_dep
from app.logging_setup import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot/shutdown hook. In F4 carichiamo qui il seed JSON nei repository."""
    configure_logging()
    log = get_logger(__name__)
    cfg = get_settings()
    log.info(
        "app_starting",
        module=MODULE_NAME,
        environment=cfg.environment,
        storage_mode=cfg.storage_mode,
        version=app.version,
    )
    # F4: load_seed_into_repositories()
    yield
    log.info("app_shutdown")


app = FastAPI(
    title="E.Practice API",
    description=(
        "Modulo case management per studi professionali — backend FastAPI V0 (in-memory). "
        "Differenziatore: vista albero della pratica con eventi ad-hoc agganciati alle fasi."
    ),
    version="0.0.1",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{API_PREFIX}/openapi.json",
)


# --- CORS: configurato da Settings ---
_settings_boot = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings_boot.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health probe ---
@app.get(f"{API_PREFIX}/health", tags=["meta"])
async def health(
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> JSONResponse:
    """Liveness probe. Usato da docker-compose, Render, e dal frontend al boot."""
    return JSONResponse(
        {
            "status": "ok",
            "module": settings.module_name,
            "environment": settings.environment,
            "storage_mode": settings.storage_mode,
            "version": app.version,
        }
    )


# Alias /healthz richiesto dal docker-compose (PR007).
@app.get("/healthz", include_in_schema=False)
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect informativo alla pagina Swagger."""
    return RedirectResponse(url="/docs")


# --- Routers del modulo (registrati man mano in F5) ---
# from app.routers import clients, practices, phases, events, notes, attachments, \
#     reminders, labels, categories, templates, users, activity, dashboard, session
#
# for router in (
#     session.router, clients.router, practices.router, phases.router, events.router,
#     notes.router, attachments.router, reminders.router, labels.router,
#     categories.router, templates.router, users.router, activity.router,
#     dashboard.router,
# ):
#     app.include_router(router, prefix=API_PREFIX)
