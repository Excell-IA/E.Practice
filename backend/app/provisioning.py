"""Tenant provisioning E.Practice, chiamato dalla shell E.Work.

EW110: la shell invoca `POST /internal/provisioning` sui moduli attivi con un
token M2M. E.Practice garantisce le proprie tabelle `practice_*` nello schema
tenant e registra la riga `module_status` del modulo. Idempotente.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.constants import MODULE_NAME
from app.db import schema_name_for
from app.logging_setup import get_logger

log = get_logger(__name__)


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class _CollectingOp:
    """Mini-op Alembic: raccoglie gli `op.execute(...)` della migration PR155."""

    def __init__(self) -> None:
        self.statements: list[str] = []

    def execute(self, statement: object) -> None:
        self.statements.append(str(statement))


def _load_practice_migration() -> ModuleType:
    backend_dir = Path(__file__).resolve().parent.parent
    migration_path = (
        backend_dir / "alembic" / "versions" / "practice_0001_create_practice_tables.py"
    )
    spec = importlib.util.spec_from_file_location(
        "practice_0001_create_practice_tables",
        migration_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Migration E.Practice non caricabile: {migration_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _ddl_statements_for_schema(schema: str) -> list[str]:
    module = _load_practice_migration()
    migration: Any = module
    collector = _CollectingOp()
    migration._SCHEMA = schema
    migration.op = collector
    upgrade = migration.upgrade
    if not callable(upgrade):
        raise RuntimeError("Migration E.Practice senza funzione upgrade()")
    upgrade()
    return collector.statements


class PracticeProvisioning:
    """Provisioning idempotente del modulo E.Practice per un tenant."""

    module_name: str = MODULE_NAME

    @classmethod
    async def create_tables(cls, tenant_id: str) -> str:
        """Garantisce le tabelle `practice_*` nello schema tenant."""
        schema = schema_name_for(tenant_id)
        settings = get_settings()
        engine = create_async_engine(
            _to_asyncpg_url(settings.database_url),
            pool_pre_ping=True,
        )
        try:
            async with engine.begin() as conn:
                for statement in _ddl_statements_for_schema(schema):
                    await conn.execute(text(statement))
        finally:
            await engine.dispose()

        log.info(
            "provisioning_create_tables_done",
            module=cls.module_name,
            tenant_id=tenant_id,
            schema=schema,
        )
        return schema

    @classmethod
    async def register_module_status(cls, tenant_id: str) -> bool:
        """Registra/aggiorna la riga `module_status` se la tabella core esiste."""
        schema = schema_name_for(tenant_id)
        settings = get_settings()
        engine = create_async_engine(
            _to_asyncpg_url(settings.database_url),
            pool_pre_ping=True,
        )
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f'SET search_path TO "{schema}", public'))
                exists = await conn.scalar(text("SELECT to_regclass('module_status')"))
                if exists is None:
                    log.warning(
                        "module_status_missing",
                        module=cls.module_name,
                        tenant_id=tenant_id,
                        schema=schema,
                    )
                    return False
                await conn.execute(
                    text(
                        "INSERT INTO module_status "
                        "(tenant_id, module_name, pending_count, updated_at) "
                        "VALUES (:tenant_id, :module_name, 0, now()) "
                        "ON CONFLICT (tenant_id, module_name) "
                        "DO UPDATE SET updated_at = now()"
                    ),
                    {"tenant_id": tenant_id, "module_name": cls.module_name},
                )
        finally:
            await engine.dispose()

        log.info(
            "module_status_registered",
            module=cls.module_name,
            tenant_id=tenant_id,
            schema=schema,
        )
        return True

    @classmethod
    async def provision_tenant(cls, tenant_id: str) -> str:
        """Provisioning completo idempotente chiamato dalla shell E.Work."""
        schema = await cls.create_tables(tenant_id)
        await cls.register_module_status(tenant_id)
        return schema

    @classmethod
    async def drop_tables(cls, tenant_id: str) -> None:
        """Offboarding T+30 in V2. Operazione non esposta nel fan-out V1."""
        log.info(
            "provisioning_drop_tables_not_implemented",
            module=cls.module_name,
            tenant_id=tenant_id,
        )
