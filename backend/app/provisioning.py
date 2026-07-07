"""Tenant provisioning E.Practice, chiamato dalla shell E.Work.

EW110: la shell invoca `POST /internal/provisioning` sui moduli attivi con un
token M2M. E.Practice garantisce le proprie tabelle `practice_*` nello schema
tenant e registra la riga `module_status` del modulo. Idempotente.
"""

from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.constants import MODULE_NAME
from app.db import _to_asyncpg_url, schema_name_for
from app.logging_setup import get_logger

log = get_logger(__name__)


@dataclass(frozen=True)
class ProvisioningResult:
    tenant_id: str
    schema: str
    status: str
    module_status: str


class _CollectingOp:
    """Mini-op Alembic: raccoglie gli `op.execute(...)` della migration PR155."""

    def __init__(self) -> None:
        self.statements: list[str] = []

    def execute(self, statement: object) -> None:
        self.statements.append(str(statement))


def _load_migration(path: Path) -> ModuleType:
    module_name = path.stem
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Migration E.Practice non caricabile: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_practice_migrations() -> list[ModuleType]:
    backend_dir = Path(__file__).resolve().parent.parent
    versions_dir = backend_dir / "alembic" / "versions"
    modules = [
        _load_migration(path)
        for path in sorted(versions_dir.glob("*.py"))
        if path.name != "__init__.py"
    ]
    practice_modules = [
        module
        for module in modules
        if getattr(module, "revision", "").startswith("practice_")
        or "practice" in (getattr(module, "branch_labels", ()) or ())
    ]
    if not practice_modules:
        raise RuntimeError(f"Nessuna migration E.Practice trovata in {versions_dir}")
    return practice_modules


def _revision_sort_key(module: ModuleType) -> str:
    revision = getattr(module, "revision", "")
    return revision if isinstance(revision, str) else ""


def _ddl_statements_for_schema(schema: str) -> list[str]:
    statements: list[str] = []
    for module in sorted(_load_practice_migrations(), key=_revision_sort_key):
        migration: Any = module
        collector = _CollectingOp()
        migration._SCHEMA = schema
        migration.op = collector
        upgrade = migration.upgrade
        if not callable(upgrade):
            revision = getattr(module, "revision", module.__name__)
            raise RuntimeError(f"Migration E.Practice {revision} senza upgrade()")
        upgrade()
        statements.extend(collector.statements)
    return statements


async def _register_module_status(conn: Any, *, tenant_id: str, schema: str) -> str:
    await conn.execute(text(f'SET search_path TO "{schema}", public'))
    exists = await conn.scalar(text("SELECT to_regclass('module_status')"))
    if exists is None:
        log.warning(
            "module_status_missing",
            module=MODULE_NAME,
            tenant_id=tenant_id,
            schema=schema,
        )
        return "missing"
    await conn.execute(
        text(
            "INSERT INTO module_status "
            "(tenant_id, module_name, pending_count, updated_at) "
            "VALUES (:tenant_id, :module_name, 0, now()) "
            "ON CONFLICT (tenant_id, module_name) "
            "DO UPDATE SET updated_at = now()"
        ),
        {"tenant_id": tenant_id, "module_name": MODULE_NAME},
    )
    return "registered"


class PracticeProvisioning:
    """Provisioning idempotente del modulo E.Practice per un tenant."""

    module_name: str = MODULE_NAME

    @classmethod
    async def create_tables(cls, tenant_id: str) -> str:
        """Garantisce le tabelle `practice_*` nello schema tenant."""
        settings = get_settings()
        if settings.storage_mode == "memory":
            log.info(
                "provisioning_create_tables_skipped",
                module=cls.module_name,
                tenant_id=tenant_id,
                storage_mode=settings.storage_mode,
            )
            return "memory"

        schema = schema_name_for(tenant_id)
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
        settings = get_settings()
        if settings.storage_mode == "memory":
            log.info(
                "module_status_skipped",
                module=cls.module_name,
                tenant_id=tenant_id,
                storage_mode=settings.storage_mode,
            )
            return False

        schema = schema_name_for(tenant_id)
        engine = create_async_engine(
            _to_asyncpg_url(settings.database_url),
            pool_pre_ping=True,
        )
        try:
            async with engine.begin() as conn:
                module_status = await _register_module_status(
                    conn,
                    tenant_id=tenant_id,
                    schema=schema,
                )
        finally:
            await engine.dispose()

        if module_status != "registered":
            return False
        log.info(
            "module_status_registered",
            module=cls.module_name,
            tenant_id=tenant_id,
            schema=schema,
        )
        return True

    @classmethod
    async def provision_tenant(cls, tenant_id: str) -> ProvisioningResult:
        """Provisioning completo idempotente chiamato dalla shell E.Work."""
        settings = get_settings()
        if settings.storage_mode == "memory":
            log.info(
                "provisioning_skipped_memory_storage",
                module=cls.module_name,
                tenant_id=tenant_id,
            )
            return ProvisioningResult(
                tenant_id=tenant_id,
                schema="memory",
                status="skipped",
                module_status="skipped",
            )

        schema = schema_name_for(tenant_id)
        engine = create_async_engine(
            _to_asyncpg_url(settings.database_url),
            pool_pre_ping=True,
        )
        try:
            async with engine.begin() as conn:
                for statement in _ddl_statements_for_schema(schema):
                    await conn.execute(text(statement))
                module_status = await _register_module_status(
                    conn,
                    tenant_id=tenant_id,
                    schema=schema,
                )
        finally:
            await engine.dispose()

        status = "provisioned" if module_status == "registered" else "partial"
        log.info(
            "provisioning_done",
            module=cls.module_name,
            tenant_id=tenant_id,
            schema=schema,
            status=status,
            module_status=module_status,
        )
        return ProvisioningResult(
            tenant_id=tenant_id,
            schema=schema,
            status=status,
            module_status=module_status,
        )

    @classmethod
    async def drop_tables(cls, tenant_id: str) -> None:
        """Offboarding T+30 in V2. Operazione non esposta nel fan-out V1."""
        log.info(
            "provisioning_drop_tables_not_implemented",
            module=cls.module_name,
            tenant_id=tenant_id,
        )
