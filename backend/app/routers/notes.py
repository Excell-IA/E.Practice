"""Router /api/notes — note libere su pratica/fase/evento."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, status

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_note_repo,
)
from app.models import ActivityLog, Note, NoteCreate
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
