"""Pydantic schemas for notes."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoteBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None
    event_id: UUID | None = None
    content: str
    author_id: UUID
    occurred_at: date | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Note(NoteBase):
    id: UUID
    created_at: datetime


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    phase_id: UUID | None = None
    event_id: UUID | None = None
    content: str | None = None
    author_id: UUID | None = None
    occurred_at: date | None = None
