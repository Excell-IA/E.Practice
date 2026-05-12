"""Helper condivisi fra i router F5.

Contiene:
- `Pagination` dependency per `?offset=&limit=` standard
- `paginate(items, pagination)` helper
- `register_exception_handlers(app)` per mappare NotFoundError/AlreadyExistsError
  ai relativi HTTPException (404/409)
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Annotated, Generic, TypeVar

from fastapi import FastAPI, Query, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.repositories.base import AlreadyExistsError, NotFoundError, RepositoryError

T = TypeVar("T")


class Pagination(BaseModel):
    """Parametri di paginazione standard (`?offset=&limit=`)."""

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=200)


def get_pagination(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 20,
) -> Pagination:
    return Pagination(offset=offset, limit=limit)


class Page(BaseModel, Generic[T]):
    """Envelope per le liste paginate."""

    items: list[T]
    total: int
    offset: int
    limit: int


def paginate(items: Sequence[T], pagination: Pagination) -> Page[T]:
    total = len(items)
    window = list(items[pagination.offset : pagination.offset + pagination.limit])
    return Page[T](items=window, total=total, offset=pagination.offset, limit=pagination.limit)


# ---------------------------------------------------------------------------
# Exception handlers (registrati su app in main.py)
# ---------------------------------------------------------------------------


async def _not_found_handler(_request: Request, exc: Exception) -> JSONResponse:
    err = exc if isinstance(exc, NotFoundError) else None
    if err is None:
        # fallback impossibile ma fa contento mypy
        return JSONResponse(status_code=500, content={"detail": "Unknown error"})
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(err), "entity": err.entity, "id": err.id},
    )


async def _already_exists_handler(_request: Request, exc: Exception) -> JSONResponse:
    err = exc if isinstance(exc, AlreadyExistsError) else None
    if err is None:
        return JSONResponse(status_code=500, content={"detail": "Unknown error"})
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(err), "entity": err.entity, "id": err.id},
    )


async def _repository_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Repository error: {exc}"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Registra i mapping NotFound/AlreadyExists/Repository → HTTP."""
    app.add_exception_handler(NotFoundError, _not_found_handler)
    app.add_exception_handler(AlreadyExistsError, _already_exists_handler)
    app.add_exception_handler(RepositoryError, _repository_handler)
