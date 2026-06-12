"""Pydantic schemas for practices."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

PracticePriority = Literal["bassa", "media", "alta"]
PracticeStatus = Literal["aperta", "in_attesa", "sospesa", "chiusa", "archiviata"]
PracticeCollaboratorRole = Literal["editor", "viewer"]
PracticeTargetType = Literal["azienda", "persona"]


class PracticeBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str
    title: str
    description: str | None = None
    client_id: UUID | None = None
    client_token: str | None = None
    target_type: PracticeTargetType | None = None
    target_id: UUID | None = None
    category_id: UUID
    responsible_id: UUID | None = None
    apertura: date
    scadenza: date | None = None
    priority: PracticePriority = "media"
    status: PracticeStatus
    created_by: UUID
    completed_at: datetime | None = None

    @model_validator(mode="after")
    def validate_subject_reference(self) -> "PracticeBase":
        has_target_type = self.target_type is not None
        has_target_id = self.target_id is not None
        if has_target_type != has_target_id:
            raise ValueError("target_type e target_id devono essere valorizzati insieme")
        if self.client_id is None and self.target_id is None:
            raise ValueError("La pratica richiede un client_id V0 oppure un target E.Contacts")
        return self


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
    target_type: PracticeTargetType | None = None
    target_id: UUID | None = None
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
