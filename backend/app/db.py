"""Connessione opzionale al database condiviso E.Work (`ework`).

Default runtime: `storage_mode=memory`, quindi questo modulo non viene usato.
Quando `STORAGE_MODE=sql` oppure `STORAGE_MODE=ework`, i repository possono usare
SQLAlchemy async puntando al Postgres condiviso e posizionando lo `search_path`
sullo schema tenant (`tenant_{slug}`).
"""

from __future__ import annotations

import re
from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

_SLUG_RE = re.compile(r"^[a-z0-9_-]+$")


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def schema_name_for(slug: str) -> str:
    if not _SLUG_RE.match(slug):
        raise ValueError(f"Slug tenant non valido: {slug!r}")
    return f"tenant_{slug.replace('-', '_')}"


@lru_cache(maxsize=1)
def _sessionmaker() -> async_sessionmaker[AsyncSession]:
    settings = get_settings()
    engine = create_async_engine(
        _to_asyncpg_url(settings.database_url),
        pool_pre_ping=True,
    )
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def set_tenant_schema(session: AsyncSession, slug: str) -> None:
    schema = schema_name_for(slug)
    await session.execute(text(f'SET search_path TO "{schema}", public'))


async def get_sql_session() -> AsyncGenerator[AsyncSession, None]:
    settings = get_settings()
    async with _sessionmaker()() as session:
        await set_tenant_schema(session, settings.ework_tenant_slug)
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
