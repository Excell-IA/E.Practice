"""Pydantic schemas for attachment metadata."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

AttachmentSource = Literal["local", "drive", "db", "scan", "url"]


class AttachmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    filename: str
    size_bytes: int
    mime_type: Optional[str] = None
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

    practice_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    event_id: Optional[UUID] = None
    filename: Optional[str] = None
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    storage_key: Optional[str] = None
    source: Optional[AttachmentSource] = None
    uploaded_by: Optional[UUID] = None
