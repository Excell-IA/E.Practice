"""Pydantic schemas for ad-hoc practice events."""

from datetime import date, datetime, time
from typing import Literal, Optional
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
    phase_id: Optional[UUID] = None
    event_type: PracticeEventType
    title: str
    description: Optional[str] = None
    event_date: date
    event_time: Optional[time] = None
    author_id: UUID
    visual_position: Optional[VisualPosition] = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PracticeEvent(PracticeEventBase):
    id: UUID
    created_at: datetime


class PracticeEventCreate(PracticeEventBase):
    pass


class PracticeEventUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    event_type: Optional[PracticeEventType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    author_id: Optional[UUID] = None
    visual_position: Optional[VisualPosition] = None
