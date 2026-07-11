"""Router /api/tasks — task assegnabili di una pratica (EPC2-01, gap #2 Kowy Caso 2).

Oggetto operativo distinto dalle fasi del template: attivita ad-hoc assegnabile a
un collaboratore interno, con scadenza, priorita, stato (colonne Kanban) e %
avanzamento. Puo' agganciarsi opzionalmente a una fase della pratica.

Integrita' (review Codex 11/07):
  - se il task e' agganciato a una fase, la fase deve appartenere alla STESSA pratica;
  - l'assegnatario, se indicato, deve essere un utente reale (assegnazione interna);
  - lo stato `completato` viene normalizzato (100% + data completamento);
  - ogni mutazione (create/update/delete) scrive nell'Activity Log (serve al drawer PR173).

Gli errori NotFoundError del Repository su update/delete sono convertiti in 404 dagli
exception handler registrati in main.py.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_practice_phase_repo,
    get_practice_repo,
    get_task_repo,
    get_user_repo,
)
from app.models import (
    ActivityLog,
    Practice,
    PracticePhase,
    PracticeTask,
    PracticeTaskCreate,
    PracticeTaskUpdate,
    TaskStatus,
    User,
)
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Ruoli che possono ricevere un task: collaboratori INTERNI dello studio.
# 'esterno' e' escluso (l'assegnazione al cliente non e' in scope, vedi §4bis Kowy).
_INTERNAL_ROLES = frozenset({"titolare", "senior", "junior"})


async def _validate_refs(
    phase_repo: Repository[PracticePhase],
    user_repo: Repository[User],
    *,
    practice_id: UUID,
    phase_id: UUID | None,
    assignee_id: UUID | None,
) -> None:
    """Verifica coerenza dei riferimenti del task (fase e assegnatario).

    - la fase, se presente, deve esistere e appartenere alla pratica del task
      (altrimenti si aggancerebbe un task alla fase di un'altra pratica);
    - l'assegnatario, se presente, deve essere un utente reale (assegnazione interna).
    """
    if phase_id is not None:
        phase = await phase_repo.get(str(phase_id))
        if phase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fase non trovata")
        if phase.practice_id != practice_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La fase indicata non appartiene alla pratica del task",
            )
    if assignee_id is not None:
        assignee = await user_repo.get(str(assignee_id))
        if assignee is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Assegnatario non valido: utente inesistente",
            )
        if assignee.status != "attivo":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Assegnatario non valido: utente non attivo",
            )
        if assignee.role not in _INTERNAL_ROLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Assegnatario non valido: ammessi solo collaboratori interni "
                "(titolare, senior, junior)",
            )


def _normalize_completion(
    data: dict[str, Any],
    *,
    current_status: str,
    current_pct: int,
    current_completed: object,
) -> None:
    """Mantiene coerente lo stato di completamento del task (muta `data` in place).

    - stato risultante `completato`  -> forza 100% e una data di completamento;
      evita l'incoerenza 'completato con 0% e senza data'.
    - RIAPERTURA di un task completato (torna a da_fare/in_corso/...) -> azzera la data
      di completamento e riporta il % a modificabile (0 se non indicato esplicitamente),
      cosi' non resta '100% + in_corso'.
    """
    new_status = data.get("status", current_status)
    if new_status == "completato":
        if data.get("completion_pct", current_pct) != 100:
            data["completion_pct"] = 100
        if data.get("completed_at", current_completed) is None:
            data["completed_at"] = datetime.now(UTC)
    elif current_status == "completato":
        data["completed_at"] = None
        if "completion_pct" not in data:
            data["completion_pct"] = 0


@router.get("", response_model=list[PracticeTask])
async def list_tasks(
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    practice_id: Annotated[UUID | None, Query()] = None,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    assignee_id: Annotated[UUID | None, Query()] = None,
) -> list[PracticeTask]:
    """Lista task, filtrabile per pratica, stato (colonna Kanban) e assegnatario."""
    filters: dict[str, object] = {}
    if practice_id is not None:
        filters["practice_id"] = practice_id
    if status_filter is not None:
        filters["status"] = status_filter
    if assignee_id is not None:
        filters["assignee_id"] = assignee_id
    return await repo.list(**filters)


@router.get("/{task_id}", response_model=PracticeTask)
async def get_task(
    task_id: UUID,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeTask:
    """Dettaglio di un singolo task."""
    task = await repo.get(str(task_id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task non trovato")
    return task


@router.post("", response_model=PracticeTask, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: PracticeTaskCreate,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeTask:
    """Crea un task agganciato a una pratica esistente (opz. a una fase)."""
    practice = await practice_repo.get(str(body.practice_id))
    if practice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pratica non trovata")
    await _validate_refs(
        phase_repo,
        user_repo,
        practice_id=body.practice_id,
        phase_id=body.phase_id,
        assignee_id=body.assignee_id,
    )
    data = body.model_dump()
    _normalize_completion(
        data, current_status=data["status"], current_pct=0, current_completed=None
    )
    task = PracticeTask(id=uuid4(), created_at=datetime.now(UTC), **data)
    created = await repo.create(task)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="created",
        entity_type="task",
        entity_id=created.id,
        practice_id=created.practice_id,
        metadata={
            "title": created.title,
            "assignee_id": str(created.assignee_id) if created.assignee_id else None,
        },
    )
    return created


@router.patch("/{task_id}", response_model=PracticeTask)
async def update_task(
    task_id: UUID,
    body: PracticeTaskUpdate,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeTask:
    """Aggiorna i campi passati (stato Kanban, assegnatario, scadenza, %, ...)."""
    current = await repo.get(str(task_id))
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task non trovato")
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nessun campo da aggiornare",
        )
    # Valida solo i riferimenti effettivamente toccati, contro la pratica del task.
    await _validate_refs(
        phase_repo,
        user_repo,
        practice_id=current.practice_id,
        phase_id=updates.get("phase_id"),
        assignee_id=updates.get("assignee_id"),
    )
    _normalize_completion(
        updates,
        current_status=current.status,
        current_pct=current.completion_pct,
        current_completed=current.completed_at,
    )
    updated = await repo.update(str(task_id), **updates)
    # 'completed' solo alla transizione verso completato; altrimenti 'updated'.
    became_completed = updated.status == "completato" and current.status != "completato"
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="completed" if became_completed else "updated",
        entity_type="task",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"status": updated.status, "completion_pct": updated.completion_pct},
    )
    return updated


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_task(
    task_id: UUID,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Elimina un task e registra l'azione nell'Activity Log."""
    task = await repo.get(str(task_id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task non trovato")
    await repo.delete(str(task_id))
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="task",
        entity_id=task.id,
        practice_id=task.practice_id,
        metadata={"title": task.title},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
