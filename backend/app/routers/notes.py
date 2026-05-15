"""Router /api/notes — note libere su pratica/fase/evento."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_note_repo,
)
from app.models import ActivityLog, Note, NoteCreate
from app.models.requests import UpdateNoteRequest
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    note_repo: Annotated[Repository[Note], Depends(get_note_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Note:
    note = Note(
        id=uuid4(),
        practice_id=body.practice_id,
        phase_id=body.phase_id,
        event_id=body.event_id,
        content=body.content,
        author_id=body.author_id,
        occurred_at=body.occurred_at,
        created_at=datetime.now(UTC),
    )
    created = await note_repo.create(note)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="commented",
        entity_type="note",
        entity_id=created.id,
        practice_id=created.practice_id,
    )
    return created


@router.put("/{note_id}", response_model=Note)
async def update_note(
    note_id: UUID,
    body: UpdateNoteRequest,
    note_repo: Annotated[Repository[Note], Depends(get_note_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Note:
    existing = await note_repo.get(str(note_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    updates = body.model_dump(exclude_unset=True)
    if "body" in updates:
        updates["content"] = updates.pop("body")
    updated = await note_repo.update(str(note_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="note",
        entity_id=updated.id,
        practice_id=updated.practice_id,
    )
    return updated


@router.delete("/{note_id}", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    note_repo: Annotated[Repository[Note], Depends(get_note_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    existing = await note_repo.get(str(note_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    await note_repo.delete(str(note_id))
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="note",
        entity_id=existing.id,
        practice_id=existing.practice_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
