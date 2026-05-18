"""Router /api/phases — completamento, modifica, skip delle fasi di una pratica."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_phase_template_repo,
    get_practice_phase_repo,
    get_practice_repo,
    get_reminder_repo,
)
from app.models import (
    ActivityLog,
    PhaseTemplate,
    Practice,
    PracticePhase,
    Reminder,
    UpdatePhaseRequest,
)
from app.models.practice_phase import PracticePhaseStatus
from app.repositories.base import Repository
from app.services.activity_service import ActivityService
from app.services.practice_service import PracticeService

router = APIRouter(prefix="/phases", tags=["phases"])


class CompletePhaseBody(BaseModel):
    note: str | None = None
    actual_end: date | None = None
    create_reminder: bool = False
    reminder_title: str | None = None
    reminder_date: date | None = None
    reminder_days_before: int = 0
    reminder_recipient: UUID | None = None


class SkipPhaseBody(BaseModel):
    skip_reason: str


class SetPhaseStatusBody(BaseModel):
    status: Literal["pending", "in_progress", "completed", "skipped", "blocked"]
    skip_reason: str | None = None


async def _recompute_practice_status(
    practice_id: UUID,
    practice_repo: Repository[Practice],
    template_repo: Repository[PhaseTemplate],
    phase_repo: Repository[PracticePhase],
    activity_repo: Repository[ActivityLog],
    current_user_id: str,
) -> None:
    svc = PracticeService(
        practice_repo,
        template_repo,
        phase_repo,
        ActivityService(activity_repo),
    )
    await svc.recompute_status(practice_id, current_user_id)


@router.put("/{phase_id}", response_model=PracticePhase)
async def update_phase(
    phase_id: UUID,
    body: UpdatePhaseRequest,
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticePhase:
    """Modifica una fase finche' non e' chiusa o saltata."""
    existing = await phase_repo.get(str(phase_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Phase {phase_id} non trovata")
    if existing.status in ("completed", "skipped"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Phase {phase_id} non modificabile (status={existing.status})",
        )
    updates = body.model_dump(exclude_unset=True)
    updated = await phase_repo.update(str(phase_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="phase",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"fields": list(updates.keys())},
    )
    return updated


@router.post("/{phase_id}/status", response_model=PracticePhase)
async def set_phase_status(
    phase_id: UUID,
    body: SetPhaseStatusBody,
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticePhase:
    """Imposta lo stato di una fase a uno dei cinque valori ammessi.

    A differenza di ``/complete`` e ``/skip``, qui sono ammesse tutte le
    transizioni (incluso il "riapri" da completed/skipped → pending) per
    supportare il flusso UI di demo. Dopo l'aggiornamento ricalcola lo stato
    della pratica padre.
    """
    existing = await phase_repo.get(str(phase_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Phase {phase_id} non trovata")

    target: PracticePhaseStatus = body.status
    now = datetime.now(UTC)
    updates: dict[str, object | None] = {"status": target}
    if target == "completed":
        updates["completed_by"] = UUID(current_user_id)
        updates["completed_at"] = now
        if existing.actual_end is None:
            updates["actual_end"] = now.date()
    elif target == "skipped":
        updates["completed_by"] = UUID(current_user_id)
        updates["completed_at"] = now
        if body.skip_reason:
            updates["skip_reason"] = body.skip_reason
    elif target in ("pending", "in_progress", "blocked"):
        updates["completed_by"] = None
        updates["completed_at"] = None
        if target != "blocked":
            updates["skip_reason"] = None

    updated = await phase_repo.update(str(phase_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="phase",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"action": "set_status", "status": target},
    )
    await _recompute_practice_status(
        updated.practice_id,
        practice_repo,
        template_repo,
        phase_repo,
        activity_repo,
        current_user_id,
    )
    return updated


@router.post("/{phase_id}/complete", response_model=PracticePhase)
async def complete_phase(
    phase_id: UUID,
    body: CompletePhaseBody,
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    reminder_repo: Annotated[Repository[Reminder], Depends(get_reminder_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticePhase:
    """Marca la fase come `completed`. Optional: crea un reminder collegato."""
    existing = await phase_repo.get(str(phase_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Phase {phase_id} non trovata")
    if existing.status in ("completed", "skipped"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Phase {phase_id} già chiusa (status={existing.status})",
        )

    now = datetime.now(UTC)
    updated = await phase_repo.update(
        str(phase_id),
        status="completed",
        actual_end=body.actual_end or now.date(),
        completed_by=UUID(current_user_id),
        completed_at=now,
    )

    activity = ActivityService(activity_repo)
    meta: dict[str, object] = {"phase_name": updated.name}
    if body.note:
        meta["note"] = body.note

    if body.create_reminder and body.reminder_date and body.reminder_recipient:
        reminder = Reminder(
            id=uuid4(),
            practice_id=updated.practice_id,
            phase_id=updated.id,
            title=body.reminder_title or f"Follow-up {updated.name}",
            target_date=body.reminder_date,
            days_before=body.reminder_days_before,
            recipient_id=body.reminder_recipient,
            status="pending",
            created_at=now,
        )
        await reminder_repo.create(reminder)
        meta["reminder_id"] = str(reminder.id)

    await activity.log(
        actor_id=current_user_id,
        action="completed",
        entity_type="phase",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata=meta,
    )
    await _recompute_practice_status(
        updated.practice_id,
        practice_repo,
        template_repo,
        phase_repo,
        activity_repo,
        current_user_id,
    )
    return updated


@router.post("/{phase_id}/skip", response_model=PracticePhase)
async def skip_phase(
    phase_id: UUID,
    body: SkipPhaseBody,
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    template_repo: Annotated[Repository[PhaseTemplate], Depends(get_phase_template_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticePhase:
    """Salta una fase con motivazione obbligatoria. Activity log con reason."""
    existing = await phase_repo.get(str(phase_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Phase {phase_id} non trovata")
    if existing.status in ("completed", "skipped"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Phase {phase_id} già chiusa (status={existing.status})",
        )
    updated = await phase_repo.update(
        str(phase_id),
        status="skipped",
        skip_reason=body.skip_reason,
        completed_by=UUID(current_user_id),
        completed_at=datetime.now(UTC),
    )
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="phase",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"reason": body.skip_reason, "action": "skip"},
    )
    await _recompute_practice_status(
        updated.practice_id,
        practice_repo,
        template_repo,
        phase_repo,
        activity_repo,
        current_user_id,
    )
    return updated
