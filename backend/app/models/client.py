"""Pydantic schemas for protected client records."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ClientType = Literal["persona_fisica", "societa", "altro"]
ClientStatus = Literal["attivo", "sospeso", "archiviato"]


class ClientBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str
    type: ClientType
    ragione_sociale: str
    piva: Optional[str] = None
    cf: Optional[str] = None
    ateco: Optional[str] = None
    indirizzo_sede: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    telefono: Optional[str] = None
    contatto_referente: Optional[str] = None
    note: Optional[str] = None
    status: ClientStatus = "attivo"
    created_by: Optional[UUID] = None
    deleted_at: Optional[datetime] = None


# L1 PROTETTO - PII, mai esposta all'AI
class Client(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: Optional[str] = None
    type: Optional[ClientType] = None
    ragione_sociale: Optional[str] = None
    piva: Optional[str] = None
    cf: Optional[str] = None
    ateco: Optional[str] = None
    indirizzo_sede: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    telefono: Optional[str] = None
    contatto_referente: Optional[str] = None
    note: Optional[str] = None
    status: Optional[ClientStatus] = None
    created_by: Optional[UUID] = None
    deleted_at: Optional[datetime] = None
