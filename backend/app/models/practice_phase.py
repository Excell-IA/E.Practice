"""Pydantic schemas for instantiated practice phases."""

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PracticePhaseStatus = Literal["pending", "in_progress", "completed", "skipped", "blocked"]


class PracticePhaseBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    template_id: Optional[UUID] = None
    order_index: int
    name: str
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    status: PracticePhaseStatus
    skip_reason: Optional[str] = None
    completed_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PracticePhase(PracticePhaseBase):
    id: UUID


class PracticePhaseCreate(PracticePhaseBase):
    pass


class PracticePhaseUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    order_index: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    status: Optional[PracticePhaseStatus] = None
    skip_reason: Optional[str] = None
    completed_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None
