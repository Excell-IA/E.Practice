"""Router /api/reminders — promemoria collegati a fasi/pratiche."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.deps import get_reminder_repo
from app.models import Reminder, ReminderStatus
from app.repositories.base import Repository

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[Reminder])
async def list_reminders(
    repo: Annotated[Repository[Reminder], Depends(get_reminder_repo)],
    status_filter: Annotated[ReminderStatus | None, Query(alias="status")] = "pending",
) -> list[Reminder]:
    items = await repo.list() if status_filter is None else await repo.list(status=status_filter)
    return sorted(items, key=lambda r: r.target_date)
