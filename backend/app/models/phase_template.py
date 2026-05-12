"""Pydantic schemas for reusable phase templates."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PhaseTemplateBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: UUID
    order_index: int
    name: str
    description: str | None = None
    duration_days: int | None = None
    default_role: str | None = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PhaseTemplate(PhaseTemplateBase):
    id: UUID


class PhaseTemplateCreate(PhaseTemplateBase):
    pass


class PhaseTemplateUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: UUID | None = None
    order_index: int | None = None
    name: str | None = None
    description: str | None = None
    duration_days: int | None = None
    default_role: str | None = None
