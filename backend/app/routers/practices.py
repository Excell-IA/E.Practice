"""Router /api/practices — lista, dettaglio (aggregato joined), create, archive."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel

from app.deps import (
    get_activity_log_repo,
    get_attachment_repo,
    get_category_repo,
    get_client_repo,
    get_current_user_id,
    get_label_repo,
    get_note_repo,
    get_phase_template_repo,
    get_practice_collaborator_bridge,
    get_practice_event_repo,
    get_practice_label_repo,
    get_practice_phase_repo,
    get_practice_repo,
    get_reminder_repo,
    get_user_repo,
)
from app.models import (
    ActivityLog,
    Attachment,
    Category,
    Client,
    CreatePracticeRequest,
    CreatePracticeResponse,
    Label,
    Note,
    PhaseTemplate,
    Practice,
    PracticeEvent,
    PracticeLabel,
    PracticePhase,
    PracticePriority,
    PracticeStatus,
    PracticeUpdate,
    Reminder,
    User,
)
from app.repositories.base import Repository
from app.repositories.memory import InMemoryRepository
from app.routers._helpers import Page, Pagination, get_pagination
from app.services.activity_service import ActivityService
from app.services.practice_service import PracticeService

router = APIRouter(prefix="/practices", tags=["practices"])


# ---------------------------------------------------------------------------
# Aggregato detail enriched (drop-ready per il frontend Daisy/Kowy)
# ---------------------------------------------------------------------------


class UserSummary(BaseModel):
    """Estratto di User per evitare di esporre PII non necessaria (no email)."""

    id: UUID
    nome: str
    cognome: str
    role: str
    initials: str
    avatar_color: str | None = None


class CategorySummary(BaseModel):
    id: UUID
    name: str
    group_name: str | None = None
    icon: str | None = None
    color: str | None = None


class LabelSummary(BaseModel):
    id: UUID
    name: str
    color: str


class PhaseEnriched(BaseModel):
    """PracticePhase + nome+avatar dell'assegnatario."""

    phase: PracticePhase
    assignee: UserSummary | None = None


class EventEnriched(BaseModel):
    event: PracticeEvent
    author: UserSummary | None = None


class NoteEnriched(BaseModel):
    note: Note
    author: UserSummary | None = None


class AttachmentEnriched(BaseModel):
    attachment: Attachment
    uploaded_by_user: UserSummary | None = None


class PracticeDetail(BaseModel):
    """Aggregato joined per la pagina Dettaglio Pratica.

    Una sola GET ritorna tutto quello che serve a Daisy/Kowy per renderare
    header + tab bar + vista albero + drawer: zero lookup extra lato frontend.
    """

    practice: Practice
    client: Client | None = None
    category: CategorySummary | None = None
    responsible: UserSummary | None = None
    labels: list[LabelSummary]
    phases: list[PhaseEnriched]
    events: list[EventEnriched]
    notes: list[NoteEnriched]
    attachments: list[AttachmentEnriched]
    collaborators: list[UserSummary]
    progress_pct: int
    counts: dict[str, int]
    """`counts.phases`, `counts.events`, `counts.notes`, `counts.attachments` —
    pronti per i badge dei tab."""


# ---------------------------------------------------------------------------
# Helper conversioni → Summary
# ---------------------------------------------------------------------------


def _user_to_summary(user: User | None) -> UserSummary | None:
    if user is None:
        return None
    initials = f"{user.nome[:1]}{user.cognome[:1]}".upper() or "??"
    return UserSummary(
        id=user.id,
        nome=user.nome,
        cognome=user.cognome,
        role=user.role,
        initials=initials,
        avatar_color=user.avatar_color,
    )


def _category_to_summary(cat: Category | None) -> CategorySummary | None:
    if cat is None:
        return None
    return CategorySummary(
        id=cat.id,
        name=cat.name,
        group_name=cat.group_name,
        icon=cat.icon,
        color=cat.color,
    )


def _label_to_summary(label: Label) -> LabelSummary:
    return LabelSummary(id=label.id, name=label.name, color=label.color)


async def _load_users_index(user_repo: Repository[User]) -> dict[str, User]:
    """Indice user_id (str) → User. Una sola listata per evitare N+1."""
    items = await user_repo.list()
    return {str(u.id): u for u in items}


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# DETAIL — aggregato joined (drop-ready frontend)
# ---------------------------------------------------------------------------


@router.get("/{practice_id}", response_model=PracticeDetail)
async def get_practice_detail(
    practice_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    category_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    label_repo: Annotated[Repository[Label], Depends(get_label_repo)],
    practice_label_repo: Annotated[InMemoryRepository[Any], Depends(get_practice_label_repo)],
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
    """Detail completo con joined names — una sola GET per la pagina."""
    practice = await practice_repo.get(str(practice_id))
    if practice is None:
        raise HTTPException(status_code=404, detail=f"Practice {practice_id} non trovata")

    # Indice users per evitare N+1 sui lookup (1 listata, poi dict)
    users_index = await _load_users_index(user_repo)

    client = await client_repo.get(str(practice.client_id))
    category = await category_repo.get(str(practice.category_id))
    responsible_user = (
        users_index.get(str(practice.responsible_id)) if practice.responsible_id else None
    )

    # Labels: join via bridge PracticeLabel
    practice_label_links = await practice_label_repo.list(practice_id=practice.id)
    label_ids = {str(link.label_id) for link in practice_label_links}
    labels: list[LabelSummary] = []
    for lid in label_ids:
        lbl = await label_repo.get(lid)
        if lbl is not None:
            labels.append(_label_to_summary(lbl))

    # Phases
    raw_phases = sorted(
        await phase_repo.list(practice_id=practice.id),
        key=lambda p: p.order_index,
    )
    phases = [
        PhaseEnriched(
            phase=p,
            assignee=_user_to_summary(
                users_index.get(str(p.assignee_id)) if p.assignee_id else None
            ),
        )
        for p in raw_phases
    ]

    # Events
    raw_events = sorted(
        await event_repo.list(practice_id=practice.id),
        key=lambda e: (e.event_date, e.event_time or ""),
    )
    events = [
        EventEnriched(event=e, author=_user_to_summary(users_index.get(str(e.author_id))))
        for e in raw_events
    ]

    # Notes
    raw_notes = sorted(
        await note_repo.list(practice_id=practice.id),
        key=lambda n: n.created_at,
        reverse=True,
    )
    notes = [
        NoteEnriched(note=n, author=_user_to_summary(users_index.get(str(n.author_id))))
        for n in raw_notes
    ]

    # Attachments
    raw_attachments = sorted(
        await attachment_repo.list(practice_id=practice.id),
        key=lambda a: a.created_at,
        reverse=True,
    )
    attachments = [
        AttachmentEnriched(
            attachment=a,
            uploaded_by_user=_user_to_summary(users_index.get(str(a.uploaded_by))),
        )
        for a in raw_attachments
    ]

    # Collaborators
    collaborator_users = [
        _user_to_summary(users_index.get(uid))
        for (pid, uid, _) in collaborators_bridge
        if pid == str(practice.id)
    ]
    collaborators = [c for c in collaborator_users if c is not None]

    # Progress %
    svc = PracticeService(practice_repo, template_repo, phase_repo, ActivityService(activity_repo))
    progress_pct = await svc.progress_percentage(practice.id)

    counts = {
        "phases": len(phases),
        "events": len(events),
        "notes": len(notes),
        "attachments": len(attachments),
        "labels": len(labels),
        "collaborators": len(collaborators),
    }

    # Audit: L1 viewed (cliente)
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
        category=_category_to_summary(category),
        responsible=_user_to_summary(responsible_user),
        labels=labels,
        phases=phases,
        events=events,
        notes=notes,
        attachments=attachments,
        collaborators=collaborators,
        progress_pct=progress_pct,
        counts=counts,
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


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------


@router.put("/{practice_id}", response_model=Practice)
async def update_practice(
    practice_id: UUID,
    body: PracticeUpdate,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Practice:
    existing = await practice_repo.get(str(practice_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Practice {practice_id} non trovata")

    updates = body.model_dump(exclude_unset=True)
    updated = await practice_repo.update(str(practice_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="practice",
        entity_id=updated.id,
        practice_id=updated.id,
        metadata={"fields": list(updates.keys())},
    )
    return updated


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------


@router.post("", response_model=CreatePracticeResponse, status_code=status.HTTP_201_CREATED)
async def create_practice(
    body: CreatePracticeRequest,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    reminder_repo: Annotated[Repository[Reminder], Depends(get_reminder_repo)],
    practice_label_repo: Annotated[InMemoryRepository[Any], Depends(get_practice_label_repo)],
    collaborators_bridge: Annotated[
        set[tuple[str, str, str]], Depends(get_practice_collaborator_bridge)
    ],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> CreatePracticeResponse:
    """Wizard creazione pratica: genera Practice + instanzia fasi dal template.

    Opzionale: se `create_default_reminders=True`, crea anche un Reminder per
    ogni fase (days_before=2). Se `label_ids` non vuoto, aggancia le etichette.
    """
    svc = PracticeService(
        practice_repo,
        template_repo,
        phase_repo,
        ActivityService(activity_repo),
        reminder_repo=reminder_repo,
    )
    response = await svc.create_with_template(body, current_user_id)

    for collab_uid in body.collaborator_ids:
        collaborators_bridge.add((str(response.practice_id), str(collab_uid), "editor"))

    # Attach etichette via bridge (id sintetico "<practice>:<label>" come fa il seed_loader)
    import contextlib

    for label_id in body.label_ids:
        link = PracticeLabel(practice_id=response.practice_id, label_id=label_id)
        bridge_id = f"{response.practice_id}:{label_id}"
        object.__setattr__(link, "id", bridge_id)
        with contextlib.suppress(Exception):
            await practice_label_repo.create(link)

    return response


# ---------------------------------------------------------------------------
# ARCHIVE
# ---------------------------------------------------------------------------


@router.post("/{practice_id}/archive", response_model=Practice)
async def archive_practice(
    practice_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Practice:
    svc = PracticeService(practice_repo, template_repo, phase_repo, ActivityService(activity_repo))
    return await svc.archive(practice_id, current_user_id)


@router.delete("/{practice_id}", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice(
    practice_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
    note_repo: Annotated[Repository[Note], Depends(get_note_repo)],
    reminder_repo: Annotated[Repository[Reminder], Depends(get_reminder_repo)],
    attachment_repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    practice_label_repo: Annotated[InMemoryRepository[Any], Depends(get_practice_label_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Cancella la pratica e tutte le entità collegate (V0 in-memory)."""
    existing = await practice_repo.get(str(practice_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    for phase in await phase_repo.list(practice_id=practice_id):
        await phase_repo.delete(str(phase.id))
    for event in await event_repo.list(practice_id=practice_id):
        await event_repo.delete(str(event.id))
    for note in await note_repo.list(practice_id=practice_id):
        await note_repo.delete(str(note.id))
    for reminder in await reminder_repo.list(practice_id=practice_id):
        await reminder_repo.delete(str(reminder.id))
    for attachment in await attachment_repo.list(practice_id=practice_id):
        await attachment_repo.delete(str(attachment.id))
    for link in await practice_label_repo.list(practice_id=practice_id):
        await practice_label_repo.delete(str(link.id))
    await practice_repo.delete(str(practice_id))
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="practice",
        entity_id=practice_id,
        metadata={"code": existing.code},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# LABELS attach/detach (drop-ready per chip etichette)
# ---------------------------------------------------------------------------


@router.get("/{practice_id}/labels", response_model=list[LabelSummary])
async def list_practice_labels(
    practice_id: UUID,
    practice_label_repo: Annotated[InMemoryRepository[Any], Depends(get_practice_label_repo)],
    label_repo: Annotated[Repository[Label], Depends(get_label_repo)],
) -> list[LabelSummary]:
    links = await practice_label_repo.list(practice_id=practice_id)
    out: list[LabelSummary] = []
    for link in links:
        lbl = await label_repo.get(str(link.label_id))
        if lbl is not None:
            out.append(_label_to_summary(lbl))
    return out
