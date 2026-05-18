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
    storage_mode: Literal["memory", "sql"] = Field(
        default="memory",
        description="V0 'memory' (dict + seed.json); V1 'sql' (PostgreSQL + SQLAlchemy).",
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

    # --- Auth ---
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
