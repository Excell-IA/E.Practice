"""Pydantic schemas for practice categories."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str
    group_name: str | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    active: bool = True


# L2 OPERATIVO - esposta all'AI solo tramite view L3
class Category(CategoryBase):
    id: UUID


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str | None = None
    group_name: str | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    active: bool | None = None
