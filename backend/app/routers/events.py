"""Router /api/events — creazione nodi-evento ad-hoc agganciati alle pratiche."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_practice_event_repo,
    get_practice_repo,
)
from app.models import (
    ActivityLog,
    CreateEventRequest,
    Practice,
    PracticeEvent,
    PracticeEventUpdate,
)
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=PracticeEvent, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: CreateEventRequest,
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeEvent:
    """Crea un nodo-evento ad-hoc agganciato alla pratica (e opzionalmente alla fase)."""
    practice = await practice_repo.get(str(body.practice_id))
    if practice is None:
        raise HTTPException(status_code=404, detail=f"Practice {body.practice_id} non trovata")
    event = PracticeEvent(
        id=uuid4(),
        practice_id=body.practice_id,
        phase_id=body.phase_id,
        event_type=body.event_type,
        title=body.title,
        description=body.description,
        event_date=body.event_date,
        event_time=body.event_time,
        author_id=body.author_id,
        visual_position=body.visual_position or "top",
        created_at=datetime.now(UTC),
    )
    created = await event_repo.create(event)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="created",
        entity_type="event",
        entity_id=created.id,
        practice_id=created.practice_id,
        metadata={"event_type": created.event_type, "title": created.title},
    )
    return created


@router.put("/{event_id}", response_model=PracticeEvent)
async def update_event(
    event_id: UUID,
    body: PracticeEventUpdate,
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeEvent:
    existing = await event_repo.get(str(event_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="Event not found")
    updates = body.model_dump(exclude_unset=True, exclude={"event_type"})
    updated = await event_repo.update(str(event_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="event",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"fields": list(updates.keys())},
    )
    return updated
