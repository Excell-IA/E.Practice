"""Pydantic schemas for instantiated practice phases."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PracticePhaseStatus = Literal["pending", "in_progress", "completed", "skipped", "blocked"]


class PracticePhaseBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    template_id: UUID | None = None
    order_index: int
    name: str
    description: str | None = None
    assignee_id: UUID | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    status: PracticePhaseStatus
    skip_reason: str | None = None
    completed_by: UUID | None = None
    completed_at: datetime | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PracticePhase(PracticePhaseBase):
    id: UUID


class PracticePhaseCreate(PracticePhaseBase):
    pass


class PracticePhaseUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    template_id: UUID | None = None
    order_index: int | None = None
    name: str | None = None
    description: str | None = None
    assignee_id: UUID | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    status: PracticePhaseStatus | None = None
    skip_reason: str | None = None
    completed_by: UUID | None = None
    completed_at: datetime | None = None
