"""Pydantic schemas for reminders."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ReminderStatus = Literal["pending", "sent", "dismissed"]


class ReminderBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None
    title: str
    target_date: date
    days_before: int = 0
    recipient_id: UUID
    status: ReminderStatus = "pending"


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Reminder(ReminderBase):
    id: UUID
    created_at: datetime


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    phase_id: UUID | None = None
    title: str | None = None
    target_date: date | None = None
    days_before: int | None = None
    recipient_id: UUID | None = None
    status: ReminderStatus | None = None
