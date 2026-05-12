"""Pydantic schemas for studio users."""

from datetime import datetime
from typing import Literal, Optional
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
    avatar_color: Optional[str] = None


# L1 PROTETTO - PII, mai esposta all'AI
class User(UserBase):
    id: UUID
    created_at: datetime
    last_access_at: Optional[datetime] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    email: Optional[str] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    avatar_color: Optional[str] = None
    last_access_at: Optional[datetime] = None
