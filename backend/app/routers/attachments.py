"""Router /api/attachments - upload V0 in memoria, attach a pratica/fase."""

from __future__ import annotations

import base64
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status

from app.deps import (
    get_activity_log_repo,
    get_attachment_repo,
    get_current_user_id,
    get_practice_repo,
    get_user_repo,
)
from app.models import ActivityLog, Attachment, AttachRequest, Practice, User
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.get("", response_model=list[Attachment])
async def list_attachments(
    repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    practice_id: Annotated[UUID | None, Query()] = None,
) -> list[Attachment]:
    """Lista allegati, filtrabile per pratica. Include anche upload non attaccati se senza filtro."""
    if practice_id is not None:
        return await repo.list(practice_id=practice_id)
    return await repo.list()


@router.post("", response_model=Attachment, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    file: UploadFile = File(...),
) -> Attachment:
    """Carica un allegato V0.

    V0 non scrive su disco/R2: conserva i byte in base64 dentro `storage_key`
    del repository in-memory. Al restart il file sparisce, come il resto dello
    stato demo runtime.
    """
    content = await file.read()
    attachment = Attachment(
        id=uuid4(),
        practice_id=None,
        phase_id=None,
        event_id=None,
        filename=file.filename or "allegato",
        size_bytes=len(content),
        mime_type=file.content_type,
        storage_key=f"memory:{base64.b64encode(content).decode('ascii')}",
        source="local",
        uploaded_by=UUID(current_user_id),
        created_at=datetime.now(UTC),
    )
    created = await repo.create(attachment)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="uploaded",
        entity_type="attachment",
        entity_id=created.id,
        metadata={"filename": created.filename, "size_bytes": created.size_bytes},
    )
    return created


@router.post("/{attachment_id}/attach", response_model=Attachment)
async def attach_attachment(
    attachment_id: UUID,
    body: AttachRequest,
    repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Attachment:
    """Aggancia un allegato caricato a una pratica e, opzionalmente, a una fase."""
    attachment = await repo.get(str(attachment_id))
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if attachment.practice_id is not None:
        raise HTTPException(status_code=400, detail="Attachment already attached")
    practice = await practice_repo.get(str(body.practice_id))
    if practice is None:
        raise HTTPException(status_code=404, detail="Practice not found")
    updated = await repo.update(
        str(attachment_id),
        phase_id=body.phase_id,
        practice_id=body.practice_id,
    )
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="attached",
        entity_type="practice",
        entity_id=body.practice_id,
        practice_id=body.practice_id,
        metadata={"attachment_id": str(updated.id), "filename": updated.filename},
    )
    return updated


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_attachment(
    attachment_id: UUID,
    repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Elimina allegato se proprietario upload o titolare."""
    attachment = await repo.get(str(attachment_id))
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    user = await user_repo.get(current_user_id)
    is_admin = user is not None and user.role == "titolare"
    if str(attachment.uploaded_by) != current_user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Attachment delete not allowed")
    await repo.delete(str(attachment_id))
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="attachment",
        entity_id=attachment.id,
        practice_id=attachment.practice_id,
        metadata={"filename": attachment.filename},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
