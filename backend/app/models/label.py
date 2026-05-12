"""Pydantic schemas for reusable labels and bridges."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LabelBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str
    color: str
    description: str | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Label(LabelBase):
    id: UUID


class LabelCreate(LabelBase):
    pass


class LabelUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str | None = None
    color: str | None = None
    description: str | None = None


class PracticeLabel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    label_id: UUID


class ClientLabel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    client_id: UUID
    label_id: UUID
