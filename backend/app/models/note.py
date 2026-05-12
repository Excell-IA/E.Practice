"""Pydantic schemas for notes."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoteBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    content: str
    author_id: UUID


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Note(NoteBase):
    id: UUID
    created_at: datetime


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    content: Optional[str] = None
    author_id: Optional[UUID] = None
