"""Router /api/templates — template fasi per categoria + preview wizard."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.deps import (
    get_activity_log_repo,
    get_category_repo,
    get_current_user_id,
    get_phase_template_repo,
)
from app.models import ActivityLog, Category, PhaseTemplate
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

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


class TemplatePhaseInput(BaseModel):
    """Fase template in input per la modifica massiva del template categoria."""

    name: str
    description: str | None = None
    duration_days: int = Field(default=1, ge=1)
    default_role: str | None = None


class ReplaceTemplateRequest(BaseModel):
    """Sostituzione atomica di tutte le fasi template di una categoria."""

    phases: list[TemplatePhaseInput]


@router.put("/{category_id}", response_model=list[PhaseTemplate])
async def replace_template_for_category(
    category_id: UUID,
    body: ReplaceTemplateRequest,
    cat_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    tpl_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> list[PhaseTemplate]:
    """Sostituisce atomicamente le fasi template per la categoria.

    Elimina tutte le fasi template esistenti per la categoria e crea le nuove
    nell'ordine fornito (order_index assegnato per posizione). Le pratiche già
    create non sono toccate: l'override del template incide solo sulle pratiche
    create dopo la modifica.
    """
    category = await cat_repo.get(str(category_id))
    if category is None:
        raise HTTPException(status_code=404, detail=f"Category {category_id} non trovata")
    existing = await tpl_repo.list(category_id=category_id)
    for tpl in existing:
        await tpl_repo.delete(str(tpl.id))
    created: list[PhaseTemplate] = []
    for index, phase in enumerate(body.phases, start=1):
        new_tpl = PhaseTemplate(
            id=uuid4(),
            category_id=category_id,
            order_index=index,
            name=phase.name,
            description=phase.description,
            duration_days=phase.duration_days,
            default_role=phase.default_role,
        )
        await tpl_repo.create(new_tpl)
        created.append(new_tpl)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="phase",
        entity_id=category_id,
        metadata={"n_phases": len(created), "category_id": str(category_id), "scope": "template"},
    )
    return created


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
