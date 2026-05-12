"""Pydantic schemas for practices."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PracticePriority = Literal["bassa", "media", "alta"]
PracticeStatus = Literal["aperta", "in_corso", "in_attesa", "sospesa", "chiusa", "archiviata"]
PracticeCollaboratorRole = Literal["editor", "viewer"]


class PracticeBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str
    title: str
    description: str | None = None
    client_id: UUID
    client_token: str
    category_id: UUID
    responsible_id: UUID | None = None
    apertura: date
    scadenza: date | None = None
    priority: PracticePriority = "media"
    status: PracticeStatus
    created_by: UUID
    completed_at: datetime | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Practice(PracticeBase):
    id: UUID
    created_at: datetime


class PracticeCreate(PracticeBase):
    pass


class PracticeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str | None = None
    title: str | None = None
    description: str | None = None
    client_id: UUID | None = None
    client_token: str | None = None
    category_id: UUID | None = None
    responsible_id: UUID | None = None
    apertura: date | None = None
    scadenza: date | None = None
    priority: PracticePriority | None = None
    status: PracticeStatus | None = None
    created_by: UUID | None = None
    completed_at: datetime | None = None


class PracticeCollaboratorBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    user_id: UUID
    role: PracticeCollaboratorRole | None = None


class PracticeCollaborator(PracticeCollaboratorBase):
    pass


class PracticeCollaboratorCreate(PracticeCollaboratorBase):
    pass


class PracticeCollaboratorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    role: PracticeCollaboratorRole | None = None
