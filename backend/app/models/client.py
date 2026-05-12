"""Pydantic schemas for protected client records."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ClientType = Literal["persona_fisica", "societa", "altro"]
ClientStatus = Literal["attivo", "sospeso", "archiviato"]


class ClientBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str
    type: ClientType
    ragione_sociale: str
    piva: str | None = None
    cf: str | None = None
    ateco: str | None = None
    indirizzo_sede: str | None = None
    email: str | None = None
    pec: str | None = None
    telefono: str | None = None
    contatto_referente: str | None = None
    note: str | None = None
    status: ClientStatus = "attivo"
    created_by: UUID | None = None
    deleted_at: datetime | None = None


# L1 PROTETTO - PII, mai esposta all'AI
class Client(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    code: str | None = None
    type: ClientType | None = None
    ragione_sociale: str | None = None
    piva: str | None = None
    cf: str | None = None
    ateco: str | None = None
    indirizzo_sede: str | None = None
    email: str | None = None
    pec: str | None = None
    telefono: str | None = None
    contatto_referente: str | None = None
    note: str | None = None
    status: ClientStatus | None = None
    created_by: UUID | None = None
    deleted_at: datetime | None = None
