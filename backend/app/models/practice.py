"""Pydantic schemas for practices."""

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PracticePriority = Literal["bassa", "media", "alta"]
PracticeStatus = Literal["aperta", "in_corso", "in_attesa", "sospesa", "chiusa", "archiviata"]
PracticeCollaboratorRole = Literal["editor", "viewer"]


class PracticeBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str
    title: str
    description: Optional[str] = None
    client_id: UUID
    client_token: str
    category_id: UUID
    responsible_id: Optional[UUID] = None
    apertura: date
    scadenza: Optional[date] = None
    priority: PracticePriority = "media"
    status: PracticeStatus
    created_by: UUID
    completed_at: Optional[datetime] = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Practice(PracticeBase):
    id: UUID
    created_at: datetime


class PracticeCreate(PracticeBase):
    pass


class PracticeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    client_token: Optional[str] = None
    category_id: Optional[UUID] = None
    responsible_id: Optional[UUID] = None
    apertura: Optional[date] = None
    scadenza: Optional[date] = None
    priority: Optional[PracticePriority] = None
    status: Optional[PracticeStatus] = None
    created_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None


class PracticeCollaboratorBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    user_id: UUID
    role: Optional[PracticeCollaboratorRole] = None


class PracticeCollaborator(PracticeCollaboratorBase):
    pass


class PracticeCollaboratorCreate(PracticeCollaboratorBase):
    pass


class PracticeCollaboratorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    role: Optional[PracticeCollaboratorRole] = None
