"""FastAPI dependencies condivisi + factory dei repository in-memory.

In V0 ogni entità ha un singleton `InMemoryRepository` istanziato qui e
iniettato nei router via `Depends`. Lo stato sopravvive per il lifetime del
processo (restart → reload dal seed JSON via `seed_loader`).

V1: la factory cambia restituendo `SQLAlchemyRepository` senza modificare
firma — i router restano identici.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.clients import ContactsClient
from app.config import Settings, get_settings
from app.constants import USER_HEADER
from app.logging_setup import bind_request_context
from app.models import (
    ActivityLog,
    Attachment,
    Category,
    Client,
    Label,
    Note,
    PhaseTemplate,
    Practice,
    PracticeEvent,
    PracticePhase,
    Reminder,
    User,
)
from app.repositories.base import Repository
from app.repositories.memory import InMemoryRepository

# ---------------------------------------------------------------------------
# Auth / contesto richiesta
# ---------------------------------------------------------------------------


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header(alias=USER_HEADER)] = None,
) -> str:
    """Recupera l'ID utente dall'header `X-User-Id` e binda al log context.

    V0: nessuna validazione contro il repository utenti (la fa il service che
    serve, vedi router session). L'header deve essere presente e non vuoto,
    altrimenti 401.
    """
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Header {USER_HEADER} mancante o vuoto",
            headers={"WWW-Authenticate": USER_HEADER},
        )
    user_id = x_user_id.strip()
    bind_request_context(user_id=user_id)
    return user_id


CurrentUserId = Annotated[str, "Depends(get_current_user_id)"]


def get_settings_dep() -> Settings:
    """Wrapper per iniettare Settings nei router via FastAPI Depends."""
    return get_settings()


def get_contacts_client() -> ContactsClient:
    settings = get_settings()
    return ContactsClient(
        settings.econtacts_base_url,
        timeout_seconds=settings.econtacts_timeout_seconds,
    )


# ---------------------------------------------------------------------------
# Repository factory (singleton via lru_cache)
# ---------------------------------------------------------------------------
# Ogni entità con `id` proprio ha la sua InMemoryRepository. I ponti M:N
# (PracticeLabel, ClientLabel, PracticeCollaborator) non hanno `id`, quindi
# li gestisco come set di tuple in `_bridges` qui sotto.


@lru_cache(maxsize=1)
def get_user_repo() -> Repository[User]:
    return InMemoryRepository[User](entity_name="User")


@lru_cache(maxsize=1)
def get_client_repo() -> Repository[Client]:
    return InMemoryRepository[Client](entity_name="Client")


@lru_cache(maxsize=1)
def get_category_repo() -> Repository[Category]:
    return InMemoryRepository[Category](entity_name="Category")


@lru_cache(maxsize=1)
def get_phase_template_repo() -> Repository[PhaseTemplate]:
    return InMemoryRepository[PhaseTemplate](entity_name="PhaseTemplate")


@lru_cache(maxsize=1)
def get_practice_repo() -> Repository[Practice]:
    return InMemoryRepository[Practice](entity_name="Practice")


@lru_cache(maxsize=1)
def get_practice_phase_repo() -> Repository[PracticePhase]:
    return InMemoryRepository[PracticePhase](entity_name="PracticePhase")


@lru_cache(maxsize=1)
def get_practice_event_repo() -> Repository[PracticeEvent]:
    return InMemoryRepository[PracticeEvent](entity_name="PracticeEvent")


@lru_cache(maxsize=1)
def get_note_repo() -> Repository[Note]:
    return InMemoryRepository[Note](entity_name="Note")


@lru_cache(maxsize=1)
def get_attachment_repo() -> Repository[Attachment]:
    return InMemoryRepository[Attachment](entity_name="Attachment")


@lru_cache(maxsize=1)
def get_reminder_repo() -> Repository[Reminder]:
    return InMemoryRepository[Reminder](entity_name="Reminder")


@lru_cache(maxsize=1)
def get_label_repo() -> Repository[Label]:
    return InMemoryRepository[Label](entity_name="Label")


@lru_cache(maxsize=1)
def get_activity_log_repo() -> Repository[ActivityLog]:
    return InMemoryRepository[ActivityLog](entity_name="ActivityLog")


# I modelli ponte `PracticeLabel`/`ClientLabel` non hanno un `id` statico
# nel Pydantic — Codex F4 lo sintetizza a runtime via object.__setattr__ con
# valore "<a_id>:<b_id>". Per accontentare mypy + Protocol HasId, tipizziamo
# i repository come `Any` (al boot vengono passati al seed_loader nel formato
# che lui si aspetta).
from typing import Any  # noqa: E402


@lru_cache(maxsize=1)
def get_practice_label_repo() -> InMemoryRepository[Any]:
    """Bridge M:N pratica↔etichetta. Codex F4 setta `id` sintetico
    `"<practice_id>:<label_id>"` sui record durante il seed."""
    return InMemoryRepository[Any](entity_name="PracticeLabel")


@lru_cache(maxsize=1)
def get_client_label_repo() -> InMemoryRepository[Any]:
    """Bridge M:N cliente↔etichetta. Stessa convenzione di `practice_label`."""
    return InMemoryRepository[Any](entity_name="ClientLabel")


# ---------------------------------------------------------------------------
# Collaborators bridge — non nel seed (gestito a runtime dai router)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_practice_collaborator_bridge() -> set[tuple[str, str, str]]:
    """Set di (practice_id, user_id, role). Role per pratica: editor | viewer.

    Non fa parte del seed_loader di Codex (F4): popolato a runtime dai
    router `POST /practices` (campo `collaborator_ids`) e da future ops.
    """
    return set()


# ---------------------------------------------------------------------------
# Vista aggregata per il seed_loader (Codex F4)
# ---------------------------------------------------------------------------


def get_all_repositories() -> dict[str, Repository]:
    """Dict nome→repo passato al `seed_loader.populate_repositories` al boot.

    Le chiavi corrispondono ESATTAMENTE alle top-level keys di `data/seed.json`
    e al `REQUIRED_SEED_KEYS` di `seed_loader.py` (Codex F4).
    `practice_collaborators` non è nel seed e resta come bridge separato.
    """
    return {
        "users": get_user_repo(),
        "clients": get_client_repo(),
        "categories": get_category_repo(),
        "phase_templates": get_phase_template_repo(),
        "practices": get_practice_repo(),
        "practice_phases": get_practice_phase_repo(),
        "practice_events": get_practice_event_repo(),
        "notes": get_note_repo(),
        "attachments": get_attachment_repo(),
        "reminders": get_reminder_repo(),
        "labels": get_label_repo(),
        "activity_log": get_activity_log_repo(),
        "practice_labels": get_practice_label_repo(),
        "client_labels": get_client_label_repo(),
    }
