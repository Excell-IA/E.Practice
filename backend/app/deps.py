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

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients import ContactsClient
from app.config import Settings, get_settings
from app.constants import USER_HEADER
from app.db import get_sql_session
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
from app.repositories.sql import SQLAlchemyRepository

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


def _use_sql(settings: Settings) -> bool:
    return settings.storage_mode in {"sql", "ework"}


async def get_optional_sql_session(
    settings: Annotated[Settings, Depends(get_settings_dep)],
):
    if not _use_sql(settings):
        yield None
        return
    async for session in get_sql_session():
        yield session


@lru_cache(maxsize=1)
def _memory_user_repo() -> Repository[User]:
    return InMemoryRepository[User](entity_name="User")


@lru_cache(maxsize=1)
def _memory_client_repo() -> Repository[Client]:
    return InMemoryRepository[Client](entity_name="Client")


@lru_cache(maxsize=1)
def _memory_category_repo() -> Repository[Category]:
    return InMemoryRepository[Category](entity_name="Category")


@lru_cache(maxsize=1)
def _memory_phase_template_repo() -> Repository[PhaseTemplate]:
    return InMemoryRepository[PhaseTemplate](entity_name="PhaseTemplate")


@lru_cache(maxsize=1)
def _memory_practice_repo() -> Repository[Practice]:
    return InMemoryRepository[Practice](entity_name="Practice")


@lru_cache(maxsize=1)
def _memory_practice_phase_repo() -> Repository[PracticePhase]:
    return InMemoryRepository[PracticePhase](entity_name="PracticePhase")


@lru_cache(maxsize=1)
def _memory_practice_event_repo() -> Repository[PracticeEvent]:
    return InMemoryRepository[PracticeEvent](entity_name="PracticeEvent")


@lru_cache(maxsize=1)
def _memory_note_repo() -> Repository[Note]:
    return InMemoryRepository[Note](entity_name="Note")


@lru_cache(maxsize=1)
def _memory_attachment_repo() -> Repository[Attachment]:
    return InMemoryRepository[Attachment](entity_name="Attachment")


@lru_cache(maxsize=1)
def _memory_reminder_repo() -> Repository[Reminder]:
    return InMemoryRepository[Reminder](entity_name="Reminder")


@lru_cache(maxsize=1)
def _memory_label_repo() -> Repository[Label]:
    return InMemoryRepository[Label](entity_name="Label")


@lru_cache(maxsize=1)
def _memory_activity_log_repo() -> Repository[ActivityLog]:
    return InMemoryRepository[ActivityLog](entity_name="ActivityLog")


def get_user_repo() -> Repository[User]:
    return _memory_user_repo()


def get_client_repo() -> Repository[Client]:
    return _memory_client_repo()


async def get_category_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Category]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Category](
            session=session,
            entity_name="Category",
            table_name="practice_categories",
            model=Category,
            columns=("id", "name", "group_name", "icon", "color", "description", "active"),
            order_by="name ASC",
            soft_delete=True,
        )
    return _memory_category_repo()


async def get_phase_template_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[PhaseTemplate]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[PhaseTemplate](
            session=session,
            entity_name="PhaseTemplate",
            table_name="practice_phase_templates",
            model=PhaseTemplate,
            columns=(
                "id",
                "category_id",
                "order_index",
                "name",
                "description",
                "duration_days",
                "default_role",
            ),
            order_by="category_id ASC, order_index ASC",
            soft_delete=True,
        )
    return _memory_phase_template_repo()


async def get_practice_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Practice]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Practice](
            session=session,
            entity_name="Practice",
            table_name="practice_practices",
            model=Practice,
            columns=(
                "id",
                "code",
                "title",
                "description",
                "client_id",
                "client_token",
                "target_type",
                "target_id",
                "category_id",
                "responsible_id",
                "apertura",
                "scadenza",
                "priority",
                "status",
                "created_by",
                "completed_at",
                "created_at",
            ),
            order_by="created_at DESC",
            soft_delete=True,
        )
    return _memory_practice_repo()


async def get_practice_phase_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[PracticePhase]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[PracticePhase](
            session=session,
            entity_name="PracticePhase",
            table_name="practice_phases",
            model=PracticePhase,
            columns=(
                "id",
                "practice_id",
                "template_id",
                "order_index",
                "name",
                "description",
                "assignee_id",
                "planned_start",
                "planned_end",
                "actual_start",
                "actual_end",
                "status",
                "skip_reason",
                "completed_by",
                "completed_at",
            ),
            order_by="practice_id ASC, order_index ASC",
            soft_delete=True,
        )
    return _memory_practice_phase_repo()


async def get_practice_event_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[PracticeEvent]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[PracticeEvent](
            session=session,
            entity_name="PracticeEvent",
            table_name="practice_events",
            model=PracticeEvent,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_type",
                "title",
                "description",
                "event_date",
                "event_time",
                "author_id",
                "visual_position",
                "participant_type",
                "participant_id",
                "created_at",
            ),
            order_by="event_date DESC, created_at DESC",
        )
    return _memory_practice_event_repo()


async def get_note_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Note]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Note](
            session=session,
            entity_name="Note",
            table_name="practice_notes",
            model=Note,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_id",
                "content",
                "author_id",
                "occurred_at",
                "created_at",
            ),
            order_by="created_at DESC",
            soft_delete=True,
        )
    return _memory_note_repo()


async def get_attachment_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Attachment]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Attachment](
            session=session,
            entity_name="Attachment",
            table_name="practice_attachments",
            model=Attachment,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_id",
                "file_name",
                "mime_type",
                "size_bytes",
                "storage_key",
                "source",
                "uploaded_by",
                "uploaded_at",
            ),
            field_to_column={"filename": "file_name", "created_at": "uploaded_at"},
            order_by="uploaded_at DESC",
            soft_delete=True,
        )
    return _memory_attachment_repo()


async def get_reminder_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Reminder]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Reminder](
            session=session,
            entity_name="Reminder",
            table_name="practice_reminders",
            model=Reminder,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "title",
                "target_date",
                "days_before",
                "recipient_id",
                "status",
                "created_at",
            ),
            order_by="target_date ASC",
            soft_delete=True,
        )
    return _memory_reminder_repo()


async def get_label_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[Label]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[Label](
            session=session,
            entity_name="Label",
            table_name="practice_labels",
            model=Label,
            columns=("id", "name", "color", "scope", "description"),
            order_by="name ASC",
            soft_delete=True,
        )
    return _memory_label_repo()


async def get_activity_log_repo(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: Annotated[AsyncSession | None, Depends(get_optional_sql_session)],
) -> Repository[ActivityLog]:
    if _use_sql(settings) and session is not None:
        return SQLAlchemyRepository[ActivityLog](
            session=session,
            entity_name="ActivityLog",
            table_name="practice_activity_log",
            model=ActivityLog,
            columns=(
                "id",
                "actor_id",
                "action",
                "entity_type",
                "entity_id",
                "practice_id",
                "metadata",
                "created_at",
            ),
            field_to_column={"timestamp": "created_at"},
            json_columns=("metadata",),
            order_by="created_at DESC",
        )
    return _memory_activity_log_repo()


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
        "users": _memory_user_repo(),
        "clients": _memory_client_repo(),
        "categories": _memory_category_repo(),
        "phase_templates": _memory_phase_template_repo(),
        "practices": _memory_practice_repo(),
        "practice_phases": _memory_practice_phase_repo(),
        "practice_events": _memory_practice_event_repo(),
        "notes": _memory_note_repo(),
        "attachments": _memory_attachment_repo(),
        "reminders": _memory_reminder_repo(),
        "labels": _memory_label_repo(),
        "activity_log": _memory_activity_log_repo(),
        "practice_labels": get_practice_label_repo(),
        "client_labels": get_client_label_repo(),
    }
