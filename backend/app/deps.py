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


# ---------------------------------------------------------------------------
# M:N bridges — set di tuple (no id proprio, no Repository[T])
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_practice_label_bridge() -> set[tuple[str, str]]:
    """Set di (practice_id, label_id). Mutevole, gestito dai router etichette."""
    return set()


@lru_cache(maxsize=1)
def get_client_label_bridge() -> set[tuple[str, str]]:
    """Set di (client_id, label_id)."""
    return set()


@lru_cache(maxsize=1)
def get_practice_collaborator_bridge() -> set[tuple[str, str, str]]:
    """Set di (practice_id, user_id, role). Role per pratica: editor | viewer."""
    return set()


# ---------------------------------------------------------------------------
# Vista aggregata per il seed_loader (Codex F4)
# ---------------------------------------------------------------------------


def get_all_repositories() -> dict[str, Repository]:
    """Dict nome→repo passato al `seed_loader.populate_repositories` al boot.

    Le chiavi corrispondono alle top-level keys di `data/seed.json`.
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
    }


def get_all_bridges() -> dict[str, set]:
    """Dict nome→bridge set per il seed_loader."""
    return {
        "practice_labels": get_practice_label_bridge(),
        "client_labels": get_client_label_bridge(),
        "practice_collaborators": get_practice_collaborator_bridge(),
    }
