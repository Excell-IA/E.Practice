"""Pydantic schemas for studio users."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

UserRole = Literal["titolare", "senior", "junior", "esterno"]
UserStatus = Literal["attivo", "sospeso", "disattivo"]


class UserBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    email: str
    nome: str
    cognome: str
    role: UserRole
    status: UserStatus = "attivo"
    avatar_color: str | None = None


# L1 PROTETTO - PII, mai esposta all'AI
class User(UserBase):
    id: UUID
    created_at: datetime
    last_access_at: datetime | None = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    email: str | None = None
    nome: str | None = None
    cognome: str | None = None
    role: UserRole | None = None
    status: UserStatus | None = None
    avatar_color: str | None = None
    last_access_at: datetime | None = None
