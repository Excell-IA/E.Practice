"""FastAPI app entry point E.Practice.

Boot integrato E.Work:
    uvicorn app.main:app --reload --port 8002
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import perf_counter
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.config import Settings, get_settings
from app.constants import API_PREFIX, DEMO_TENANT_ID, MODULE_NAME
from app.deps import get_all_repositories, get_settings_dep
from app.logging_setup import (
    bind_request_context,
    clear_request_context,
    configure_logging,
    get_logger,
)
from app.routers._helpers import register_exception_handlers


async def _try_load_seed() -> None:
    """Carica il seed JSON in V0 se il loader di F4 (Codex) è disponibile.

    Difensivo: l'import può fallire se il file `seed_loader.py` non è ancora
    in repo (F4 in corso). In quel caso logga un warning e prosegue con
    repository vuoti (utile per smoke test).
    """
    log = get_logger(__name__)
    try:
        import importlib

        seed_loader = importlib.import_module("app.repositories.seed_loader")
    except ImportError:
        log.warning(
            "seed_loader_not_available",
            note="seed_loader.py non ancora in repo (F4 Codex in corso). Repo vuoti.",
        )
        return

    cfg = get_settings()
    repos = get_all_repositories()

    # Firma Codex F4: load_seed_json(path) + populate_repositories(data, repos)
    if hasattr(seed_loader, "load_seed_json") and hasattr(seed_loader, "populate_repositories"):
        try:
            data = seed_loader.load_seed_json(cfg.seed_path)
            seed_loader.populate_repositories(data, repos)
            log.info("seed_loaded", path=cfg.seed_path)
            return
        except Exception as exc:
            log.error(
                "seed_load_failed",
                error_type=type(exc).__name__,
                path=cfg.seed_path,
            )
            return

    log.warning("seed_loader_unknown_api", module=seed_loader.__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot/shutdown hook. Carica seed JSON in V0 quando F4 sarà mergiata."""
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
    await _try_load_seed()
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
    allow_origin_regex=_settings_boot.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Exception handlers (NotFound 404, AlreadyExists 409, Repository 500) ---
register_exception_handlers(app)


@app.middleware("http")
async def request_observability(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Propaga il correlation ID e produce un log tecnico privo di PII."""
    correlation_id = request.headers.get("X-Correlation-Id") or str(uuid4())
    clear_request_context()
    bind_request_context(
        correlation_id=correlation_id,
        tenant_id=_settings_boot.tenant_id or DEMO_TENANT_ID,
    )
    started = perf_counter()
    log = get_logger("ework.epractice.http")
    try:
        response = await call_next(request)
    except Exception:
        log.exception(
            "request_failed",
            method=request.method,
            path=request.url.path,
            duration_ms=round((perf_counter() - started) * 1000),
        )
        raise
    else:
        response.headers["X-Correlation-Id"] = correlation_id
        log.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round((perf_counter() - started) * 1000),
        )
        return response
    finally:
        clear_request_context()


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


@app.api_route("/healthz", methods=["GET", "HEAD"], include_in_schema=False)
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect informativo alla pagina Swagger."""
    return RedirectResponse(url="/docs")


# --- Routers del modulo (F5) ---
from app.routers import (  # noqa: E402
    activity,
    attachments,
    categories,
    clients,
    contacts,
    dashboard,
    events,
    internal,
    notes,
    phases,
    practices,
    reminders,
    search,
    session,
    tasks,
    templates,
    users,
)

for router in (
    session.router,
    users.router,
    clients.router,
    contacts.router,
    categories.router,
    templates.router,
    practices.router,
    phases.router,
    tasks.router,
    events.router,
    notes.router,
    attachments.router,
    reminders.router,
    activity.router,
    dashboard.router,
    search.router,
):
    app.include_router(router, prefix=API_PREFIX)

# Endpoint M2M chiamato dalla shell E.Work: deve restare fuori da /api,
# allineato a E.Contacts e al fan-out EW110.
app.include_router(internal.router)
