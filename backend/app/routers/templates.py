"""Router /api/templates — template fasi per categoria."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.deps import get_phase_template_repo
from app.models import PhaseTemplate
from app.repositories.base import Repository

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/{category_id}", response_model=list[PhaseTemplate])
async def list_templates_for_category(
    category_id: UUID,
    tpl_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
) -> list[PhaseTemplate]:
    """Lista fasi del template per la categoria, ordinate per order_index."""
    items = await tpl_repo.list(category_id=category_id)
    return sorted(items, key=lambda t: t.order_index)
