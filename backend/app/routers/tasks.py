"""Router /api/tasks — task assegnabili di una pratica (EPC2-01, gap #2 Kowy Caso 2).

Oggetto operativo distinto dalle fasi del template: attivita ad-hoc assegnabile a
un collaboratore interno, con scadenza, priorita, stato (colonne Kanban) e %
avanzamento. Puo' agganciarsi opzionalmente a una fase della pratica.

Gli errori del Repository (NotFoundError su update/delete) sono convertiti in 404
dagli exception handler registrati in main.py; qui li lasciamo propagare.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.deps import get_current_user_id, get_practice_repo, get_task_repo
from app.models import (
    Practice,
    PracticeTask,
    PracticeTaskCreate,
    PracticeTaskUpdate,
    TaskStatus,
)
from app.repositories.base import Repository

router = APIRouter(prefix="/tasks", tags=["tasks"])


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
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeTask:
    """Crea un task agganciato a una pratica esistente (opz. a una fase)."""
    practice = await practice_repo.get(str(body.practice_id))
    if practice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pratica non trovata")
    task = PracticeTask(id=uuid4(), created_at=datetime.now(UTC), **body.model_dump())
    return await repo.create(task)


@router.patch("/{task_id}", response_model=PracticeTask)
async def update_task(
    task_id: UUID,
    body: PracticeTaskUpdate,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> PracticeTask:
    """Aggiorna i campi passati (stato Kanban, assegnatario, scadenza, %, ...)."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nessun campo da aggiornare",
        )
    return await repo.update(str(task_id), **updates)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_task(
    task_id: UUID,
    repo: Annotated[Repository[PracticeTask], Depends(get_task_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Elimina un task (NotFoundError -> 404 via exception handler)."""
    await repo.delete(str(task_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
