"""Router /api/practices — pratiche (lista, dettaglio, creazione con template, archivio)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.deps import (
    get_activity_log_repo,
    get_attachment_repo,
    get_client_repo,
    get_current_user_id,
    get_note_repo,
    get_phase_template_repo,
    get_practice_collaborator_bridge,
    get_practice_event_repo,
    get_practice_phase_repo,
    get_practice_repo,
)
from app.models import (
    ActivityLog,
    Attachment,
    Client,
    CreatePracticeRequest,
    CreatePracticeResponse,
    Note,
    PhaseTemplate,
    Practice,
    PracticeEvent,
    PracticePhase,
    PracticePriority,
    PracticeStatus,
)
from app.repositories.base import Repository
from app.routers._helpers import Page, Pagination, get_pagination
from app.services.activity_service import ActivityService
from app.services.practice_service import PracticeService

router = APIRouter(prefix="/practices", tags=["practices"])


class PracticeDetail(BaseModel):
    """Aggregato per il dettaglio pratica (vista albero + tab)."""

    practice: Practice
    client: Client | None = None
    phases: list[PracticePhase]
    events: list[PracticeEvent]
    notes: list[Note]
    attachments: list[Attachment]
    collaborators: list[UUID]
    progress_pct: int


# ----- LIST -----


@router.get("", response_model=Page[Practice])
async def list_practices(
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    pagination: Annotated[Pagination, Depends(get_pagination)],
    q: Annotated[str | None, Query(description="Ricerca su title, code")] = None,
    status_filter: Annotated[PracticeStatus | None, Query(alias="status")] = None,
    priority: Annotated[PracticePriority | None, Query()] = None,
    responsible_id: Annotated[UUID | None, Query()] = None,
    client_id: Annotated[UUID | None, Query()] = None,
    category_id: Annotated[UUID | None, Query()] = None,
) -> Page[Practice]:
    filters: dict[str, object] = {}
    if status_filter:
        filters["status"] = status_filter
    if priority:
        filters["priority"] = priority
    if responsible_id:
        filters["responsible_id"] = responsible_id
    if client_id:
        filters["client_id"] = client_id
    if category_id:
        filters["category_id"] = category_id
    items = await practice_repo.list(**filters)
    if q:
        needle = q.casefold()
        items = [
            p
            for p in items
            if needle in p.title.casefold() or (p.code and needle in p.code.casefold())
        ]
    items.sort(key=lambda p: (p.scadenza or p.apertura), reverse=True)
    return Page[Practice](
        items=items[pagination.offset : pagination.offset + pagination.limit],
        total=len(items),
        offset=pagination.offset,
        limit=pagination.limit,
    )


# ----- DETAIL -----


@router.get("/{practice_id}", response_model=PracticeDetail)
async def get_practice_detail(
    practice_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
    note_repo: Annotated[Repository[Note], Depends(get_note_repo)],
    attachment_repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    collaborators_bridge: Annotated[
        set[tuple[str, str, str]], Depends(get_practice_collaborator_bridge)
    ],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeDetail:
    """Aggregato pratica per la vista albero + tab dettaglio."""
    practice = await practice_repo.get(str(practice_id))
    if practice is None:
        raise HTTPException(status_code=404, detail=f"Practice {practice_id} non trovata")

    client = await client_repo.get(str(practice.client_id))
    phases = sorted(
        await phase_repo.list(practice_id=practice.id),
        key=lambda p: p.order_index,
    )
    events = sorted(
        await event_repo.list(practice_id=practice.id),
        key=lambda e: (e.event_date, e.event_time or ""),
    )
    notes = await note_repo.list(practice_id=practice.id)
    attachments = await attachment_repo.list(practice_id=practice.id)

    collaborator_ids = [
        UUID(uid) for (pid, uid, _) in collaborators_bridge if pid == str(practice.id)
    ]

    svc = PracticeService(
        practice_repo,
        template_repo,
        phase_repo,
        ActivityService(activity_repo),
    )
    progress_pct = await svc.progress_percentage(practice.id)

    # Log viewed_l1 perché esponiamo i dati cliente
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="viewed_l1",
        entity_type="practice",
        entity_id=practice.id,
        practice_id=practice.id,
    )

    return PracticeDetail(
        practice=practice,
        client=client,
        phases=list(phases),
        events=list(events),
        notes=notes,
        attachments=attachments,
        collaborators=collaborator_ids,
        progress_pct=progress_pct,
    )


@router.get("/{practice_id}/phases", response_model=list[PracticePhase])
async def list_practice_phases(
    practice_id: UUID,
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
) -> list[PracticePhase]:
    phases = await phase_repo.list(practice_id=practice_id)
    return sorted(phases, key=lambda p: p.order_index)


@router.get("/{practice_id}/events", response_model=list[PracticeEvent])
async def list_practice_events(
    practice_id: UUID,
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
) -> list[PracticeEvent]:
    events = await event_repo.list(practice_id=practice_id)
    return sorted(events, key=lambda e: (e.event_date, e.event_time or ""))


# ----- CREATE -----


@router.post("", response_model=CreatePracticeResponse, status_code=status.HTTP_201_CREATED)
async def create_practice(
    body: CreatePracticeRequest,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    collaborators_bridge: Annotated[
        set[tuple[str, str, str]], Depends(get_practice_collaborator_bridge)
    ],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> CreatePracticeResponse:
    """Wizard creazione pratica: genera Practice + instanzia fasi dal template."""
    svc = PracticeService(
        practice_repo,
        template_repo,
        phase_repo,
        ActivityService(activity_repo),
    )
    response = await svc.create_with_template(body, current_user_id)

    # Registra collaboratori opzionali nel bridge M:N
    for collab_uid in body.collaborator_ids:
        collaborators_bridge.add((str(response.practice_id), str(collab_uid), "editor"))

    return response


# ----- ARCHIVE -----


@router.post("/{practice_id}/archive", response_model=Practice)
async def archive_practice(
    practice_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Practice:
    svc = PracticeService(
        practice_repo,
        template_repo,
        phase_repo,
        ActivityService(activity_repo),
    )
    return await svc.archive(practice_id, current_user_id)
