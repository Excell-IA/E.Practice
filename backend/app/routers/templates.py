"""Router /api/templates — template fasi per categoria + preview wizard."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.deps import get_category_repo, get_phase_template_repo
from app.models import Category, PhaseTemplate
from app.repositories.base import Repository

router = APIRouter(prefix="/templates", tags=["templates"])


# ---------------------------------------------------------------------------
# GET /templates/{category_id}  — lista fasi semplice (già esistente, no change)
# ---------------------------------------------------------------------------


@router.get("/{category_id}", response_model=list[PhaseTemplate])
async def list_templates_for_category(
    category_id: UUID,
    tpl_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
) -> list[PhaseTemplate]:
    """Lista fasi del template per la categoria, ordinate per order_index."""
    items = await tpl_repo.list(category_id=category_id)
    return sorted(items, key=lambda t: t.order_index)


# ---------------------------------------------------------------------------
# GET /templates/category/{id}/preview  — anteprima wizard nuova pratica
# ---------------------------------------------------------------------------


class TemplatePhasePreview(BaseModel):
    order_index: int
    name: str
    description: str | None = None
    duration_days: int
    planned_start: date
    planned_end: date


class TemplatePreview(BaseModel):
    """Anteprima fasi + scadenza calcolata, per modal Nuova Pratica step 2/3."""

    category_id: UUID
    category_name: str
    apertura: date
    scadenza_calcolata: date
    total_duration_days: int = Field(
        description="Somma di duration_days delle fasi (giorni cumulativi)."
    )
    phases: list[TemplatePhasePreview]


@router.get("/category/{category_id}/preview", response_model=TemplatePreview)
async def template_preview(
    category_id: UUID,
    cat_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    tpl_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    apertura: Annotated[
        date | None,
        Query(description="Data apertura ipotetica (default oggi)"),
    ] = None,
) -> TemplatePreview:
    """Restituisce le fasi del template con date pianificate cumulative
    a partire da `apertura`, e calcola la scadenza finale.

    Usato dal modal Nuova Pratica:
    - Step 2 mostra la scadenza calcolata
    - Step 3 mostra le N fasi con durata e anteprima date
    """
    category = await cat_repo.get(str(category_id))
    if category is None:
        raise HTTPException(status_code=404, detail=f"Category {category_id} non trovata")

    raw_phases = sorted(
        await tpl_repo.list(category_id=category_id),
        key=lambda t: t.order_index,
    )

    start_date = apertura or date.today()
    cursor = start_date
    total = 0
    previews: list[TemplatePhasePreview] = []
    for tpl in raw_phases:
        duration = tpl.duration_days if tpl.duration_days and tpl.duration_days > 0 else 1
        phase_end = cursor + timedelta(days=duration)
        previews.append(
            TemplatePhasePreview(
                order_index=tpl.order_index,
                name=tpl.name,
                description=tpl.description,
                duration_days=duration,
                planned_start=cursor,
                planned_end=phase_end,
            )
        )
        total += duration
        cursor = phase_end

    return TemplatePreview(
        category_id=category.id,
        category_name=category.name,
        apertura=start_date,
        scadenza_calcolata=cursor,
        total_duration_days=total,
        phases=previews,
    )
