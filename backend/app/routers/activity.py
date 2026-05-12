"""Router /api/activity — registro attività immutabile, filtrabile."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.deps import get_activity_log_repo
from app.models import ActivityAction, ActivityEntityType, ActivityLog
from app.repositories.base import Repository
from app.routers._helpers import Page, Pagination, get_pagination

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=Page[ActivityLog])
async def list_activity(
    repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    pagination: Annotated[Pagination, Depends(get_pagination)],
    actor_id: Annotated[UUID | None, Query()] = None,
    action: Annotated[ActivityAction | None, Query()] = None,
    entity_type: Annotated[ActivityEntityType | None, Query()] = None,
    practice_id: Annotated[UUID | None, Query()] = None,
) -> Page[ActivityLog]:
    filters: dict[str, object] = {}
    if actor_id:
        filters["actor_id"] = actor_id
    if action:
        filters["action"] = action
    if entity_type:
        filters["entity_type"] = entity_type
    if practice_id:
        filters["practice_id"] = practice_id
    items = await repo.list(**filters)
    items.sort(key=lambda a: a.timestamp, reverse=True)
    return Page[ActivityLog](
        items=items[pagination.offset : pagination.offset + pagination.limit],
        total=len(items),
        offset=pagination.offset,
        limit=pagination.limit,
    )
