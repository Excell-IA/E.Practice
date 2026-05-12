"""Pydantic schemas for practice categories."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str
    group_name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    active: bool = True


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Category(CategoryBase):
    id: UUID


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: Optional[str] = None
    group_name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
