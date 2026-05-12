"""structlog setup con contextvars E.Practice (tenant_id, user_id, practice_id).

Standard E.Work — ogni log riga porta con sé il contesto della richiesta corrente
senza doverlo passare esplicitamente. In V0 `tenant_id` è hardcoded a 'demo';
gli altri due variano per richiesta e si bindano nei dependency / middleware.

Uso:
    from app.logging_setup import configure_logging, get_logger, bind_request_context

    configure_logging()                 # una volta al boot, in main.py lifespan
    log = get_logger(__name__)
    log.info("practice_created", code="PR-2026-001")  # → include tenant_id/user_id/practice_id
"""

from __future__ import annotations

import logging
import sys
from typing import cast

import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars
from structlog.typing import EventDict, WrappedLogger

from app.config import Settings, get_settings
from app.constants import DEMO_TENANT_ID, MODULE_NAME


def _add_module_name(_logger: WrappedLogger, _method: str, event_dict: EventDict) -> EventDict:
    """Inserisce `module='e-practice'` su ogni record (standard E.Work)."""
    event_dict.setdefault("module", MODULE_NAME)
    return event_dict


def configure_logging(settings: Settings | None = None) -> None:
    """Configura structlog + standard logging stdlib.

    Idempotent: chiamabile più volte senza effetti collaterali. Tipicamente
    invocato una volta nel lifespan di FastAPI (main.py).
    """
    cfg = settings or get_settings()

    # Allinea stdlib logging al livello richiesto (es. uvicorn usa stdlib).
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, cfg.log_level),
    )

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_module_name,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: structlog.types.Processor
    if cfg.log_format == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, cfg.log_level)),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Binda subito il tenant V0 (hardcoded 'demo'). Sovrascrivibile per richiesta.
    bind_contextvars(tenant_id=cfg.tenant_id or DEMO_TENANT_ID)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Helper tipato. Equivalente a `structlog.get_logger(name)`."""
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))


def bind_request_context(
    *,
    user_id: str | None = None,
    practice_id: str | None = None,
    tenant_id: str | None = None,
) -> None:
    """Aggiunge user_id / practice_id / tenant_id al contesto della richiesta.

    Chiamato dai dependency FastAPI (`get_current_user`) o da un middleware
    request-scoped. Pulire con `clear_request_context()` a fine richiesta.
    """
    payload: dict[str, str] = {}
    if user_id is not None:
        payload["user_id"] = user_id
    if practice_id is not None:
        payload["practice_id"] = practice_id
    if tenant_id is not None:
        payload["tenant_id"] = tenant_id
    if payload:
        bind_contextvars(**payload)


def clear_request_context() -> None:
    """Reset dei contextvars per non far leakare il contesto tra richieste."""
    clear_contextvars()
