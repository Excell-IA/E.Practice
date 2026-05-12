"""Tenant Provisioning E.Practice — stub V0.

Standard E.Work: ogni modulo espone una classe `<Modulo>Provisioning` con
metodo `create_tables(tenant_id)` che la shell chiama quando viene attivato
il modulo per un tenant (V1+: CREATE SCHEMA + CREATE TABLE per le tabelle del
modulo + seed default + registrazione in public.module_status).

In V0 è un no-op (tenant hardcoded 'demo', stato in memoria). Lo scheletro
sta qui per coerenza con lo standard e per essere già richiamabile in test.
"""

from __future__ import annotations

from app.constants import MODULE_NAME
from app.logging_setup import get_logger

log = get_logger(__name__)


class PracticeProvisioning:
    """Provisioning del modulo E.Practice per un tenant.

    V0: no-op (in-memory). V1: CREATE SCHEMA tenant_<id> + DDL completo
    + seed (categorie, template fasi, etichette). V2: triggerato da Stripe
    webhook dopo conferma abbonamento.
    """

    module_name: str = MODULE_NAME

    @classmethod
    async def create_tables(cls, tenant_id: str) -> None:
        """Provisioning idempotente per il tenant. In V0 logga e ritorna."""
        log.info(
            "provisioning_create_tables_stub",
            module=cls.module_name,
            tenant_id=tenant_id,
            note="V0 no-op; verrà implementato in V1 con SQLAlchemy DDL",
        )

    @classmethod
    async def drop_tables(cls, tenant_id: str) -> None:
        """Offboarding T+30 in V2. In V0 no-op."""
        log.info(
            "provisioning_drop_tables_stub",
            module=cls.module_name,
            tenant_id=tenant_id,
        )
