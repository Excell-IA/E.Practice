"""Contratto locale e stabile per consumare E.Contacts."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

ContactTargetType = Literal["azienda", "persona"]


class ContactSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    target_id: UUID
    target_type: ContactTargetType
    display_name: str
    tax_id: str | None = None
    email: str | None = None
    city: str | None = None
    status: str | None = None
    role: str | None = None
    confidence: float | None = None
    match_type: str | None = None
    source: Literal["econtacts"] = "econtacts"


class ContactDetail(ContactSummary):
    phone: str | None = None
    address: str | None = None
    company_id: UUID | None = None
    site_id: UUID | None = None
    contact_person_id: UUID | None = None


class ContactCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    target_type: ContactTargetType
    display_name: str
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None


class ContactUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    display_name: str | None = None
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
