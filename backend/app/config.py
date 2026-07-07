"""Settings dell'app via Pydantic v2 BaseSettings.

Le variabili sono lette dal `.env` (sviluppo locale) o dall'ambiente del
container (Docker / Render). Mai committare un `.env` con valori veri:
`.env.example` documenta i nomi delle variabili.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import DEMO_TENANT_ID, MODULE_NAME


class Settings(BaseSettings):
    """Configurazione runtime del backend E.Practice."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Identità modulo ---
    module_name: str = Field(default=MODULE_NAME, description="Standard E.Work, immutabile.")
    tenant_id: str = Field(default=DEMO_TENANT_ID, description="V0 hardcoded 'demo'.")
    environment: Literal["dev", "staging", "production"] = "dev"

    # --- Storage ---
    storage_mode: Literal["memory", "sql", "ework"] = Field(
        default="memory",
        description=(
            "V0 'memory' (dict + seed.json); V1 'sql'/'ework' "
            "(PostgreSQL condiviso E.Work + SQLAlchemy)."
        ),
    )
    database_url: str = Field(
        default="postgresql+asyncpg://ework:ework_dev@localhost:5432/ework",
        description="DB condiviso E.Work. Usato solo con STORAGE_MODE=sql/ework.",
    )
    ework_tenant_slug: str = Field(
        default="excellia",
        description="Slug tenant E.Work: seleziona lo schema tenant_{slug}.",
    )
    seed_path: str = Field(
        default="../data/seed.json",
        description="Percorso JSON di seed in V0 (relativo a backend/).",
    )

    # --- HTTP / CORS ---
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        description="Origini autorizzate. In production: dominio Vercel del frontend.",
    )
    cors_origin_regex: str | None = Field(
        default=r"https://e-practice.*-excellia-projects\.vercel\.app",
        description=(
            "Regex di origini autorizzate (usato per i preview deploy Vercel, che "
            "generano un URL diverso ad ogni build). Override con env CORS_ORIGIN_REGEX."
        ),
    )

    # --- Servizi E.Work ---
    econtacts_base_url: str = Field(
        default="http://127.0.0.1:8001",
        description="API E.Contacts autorevole per aziende e persone.",
    )
    econtacts_timeout_seconds: float = Field(default=3.0, gt=0)

    # --- Auth ---
    jwt_secret: str = Field(
        default="dev_secret_cambia_in_produzione",
        description="Segreto JWT condiviso con la shell E.Work.",
    )
    jwt_algorithm: Literal["HS256"] = "HS256"
    collaudo_mode: bool = Field(
        default=True,
        description=(
            "Bypass locale: se manca Authorization usa X-User-Id. "
            "In produzione deve essere false."
        ),
    )
    collaudo_tenant_id: str = Field(default="excellia")
    collaudo_user_id: str = Field(default="11111111-1111-4111-8111-000000000001")
    basic_auth_user: str | None = Field(
        default=None,
        description="Se valorizzato, abilita HTTP Basic Auth sul backend (deploy demo).",
    )
    basic_auth_pass: str | None = Field(default=None)

    # --- Logging ---
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["json", "console"] = Field(
        default="console",
        description="'console' per dev (colorato), 'json' per production.",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton settings; cached per il lifetime del processo."""
    return Settings()
