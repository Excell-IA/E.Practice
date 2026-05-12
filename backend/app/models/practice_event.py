"""Pydantic schemas for ad-hoc practice events."""

from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PracticeEventType = Literal[
    "telefonata_in",
    "telefonata_out",
    "email_in",
    "email_out",
    "incontro",
    "documento_in",
    "documento_out",
    "delega",
    "f24",
    "attesa_cliente",
    "nota_interna",
    "esterno",
]
VisualPosition = Literal["top", "bottom"]


class PracticeEventBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None
    event_type: PracticeEventType
    title: str
    description: str | None = None
    event_date: date
    event_time: time | None = None
    author_id: UUID
    visual_position: VisualPosition | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PracticeEvent(PracticeEventBase):
    id: UUID
    created_at: datetime


class PracticeEventCreate(PracticeEventBase):
    pass


class PracticeEventUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    phase_id: UUID | None = None
    event_type: PracticeEventType | None = None
    title: str | None = None
    description: str | None = None
    event_date: date | None = None
    event_time: time | None = None
    author_id: UUID | None = None
    visual_position: VisualPosition | None = None
