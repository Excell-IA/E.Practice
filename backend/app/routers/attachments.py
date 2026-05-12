"""Router /api/attachments — metadati allegati (storage reale in F22 / R2)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import get_attachment_repo
from app.models import Attachment
from app.repositories.base import Repository

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.get("", response_model=list[Attachment])
async def list_attachments(
    repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
) -> list[Attachment]:
    """Lista allegati (filtri arrivano in iterazione successiva)."""
    return await repo.list()
