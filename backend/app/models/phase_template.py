"""Pydantic schemas for reusable phase templates."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PhaseTemplateBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: UUID
    order_index: int
    name: str
    description: Optional[str] = None
    duration_days: Optional[int] = None
    default_role: Optional[str] = None


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class PhaseTemplate(PhaseTemplateBase):
    id: UUID


class PhaseTemplateCreate(PhaseTemplateBase):
    pass


class PhaseTemplateUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = None
    order_index: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    default_role: Optional[str] = None
