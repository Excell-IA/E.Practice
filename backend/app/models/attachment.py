"""Pydantic schemas for attachment metadata."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

AttachmentSource = Literal["local", "drive", "db", "scan", "url"]


class AttachmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    phase_id: UUID | None = None
    event_id: UUID | None = None
    filename: str
    size_bytes: int
    mime_type: str | None = None
    storage_key: str
    source: AttachmentSource = "local"
    uploaded_by: UUID


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Attachment(AttachmentBase):
    id: UUID
    created_at: datetime


class AttachmentCreate(AttachmentBase):
    pass


class AttachmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID | None = None
    phase_id: UUID | None = None
    event_id: UUID | None = None
    filename: str | None = None
    size_bytes: int | None = None
    mime_type: str | None = None
    storage_key: str | None = None
    source: AttachmentSource | None = None
    uploaded_by: UUID | None = None
