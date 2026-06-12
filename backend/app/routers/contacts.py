"""Proxy applicativo verso la rubrica autorevole E.Contacts."""

from __future__ import annotations

from typing import Annotated, Any, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status

from app.clients import ContactsClient, ContactsClientError
from app.clients.contact_mapper import (
    company_to_detail,
    grid_to_summary,
    match_to_summary,
    person_to_detail,
)
from app.deps import get_contacts_client, get_current_user_id
from app.models import (
    ContactCreateRequest,
    ContactDetail,
    ContactSummary,
    ContactTargetType,
    ContactUpdateRequest,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _raise_contacts_error(exc: ContactsClientError) -> NoReturn:
    status_code = exc.status_code if 400 <= exc.status_code < 500 else 503
    raise HTTPException(status_code=status_code, detail=exc.detail) from exc


async def _detail(
    client: ContactsClient,
    target_type: ContactTargetType,
    target_id: UUID,
    authorization: str | None,
    correlation_id: str | None,
) -> ContactDetail:
    try:
        payload = await client.get_subject(
            target_type,
            target_id,
            authorization=authorization,
            correlation_id=correlation_id,
        )
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    return person_to_detail(payload) if target_type == "persona" else company_to_detail(payload)


@router.get("", response_model=list[ContactSummary])
async def list_contacts(
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ContactSummary]:
    try:
        items = await client.list_subjects(
            authorization=authorization,
            correlation_id=correlation_id,
            limit=limit,
            offset=offset,
        )
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    return [grid_to_summary(item) for item in items]


@router.get("/search", response_model=list[ContactSummary])
async def search_contacts(
    q: Annotated[str, Query(min_length=1)],
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[ContactSummary]:
    try:
        items = await client.search(
            q,
            authorization=authorization,
            correlation_id=correlation_id,
            limit=limit,
        )
        operational = await client.list_subjects(
            authorization=authorization,
            correlation_id=correlation_id,
            limit=100,
            offset=0,
        )
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    operational_ids = {str(item["id_soggetto"]) for item in operational}
    summaries = [match_to_summary(item) for item in items]
    return [
        item for item in summaries if item is not None and str(item.target_id) in operational_ids
    ]


@router.get("/{target_type}/{target_id}", response_model=ContactDetail)
async def get_contact(
    target_type: ContactTargetType,
    target_id: UUID,
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
) -> ContactDetail:
    return await _detail(client, target_type, target_id, authorization, correlation_id)


@router.post("", response_model=ContactDetail, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreateRequest,
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
) -> ContactDetail:
    try:
        if body.target_type == "azienda":
            created = await client.create_company(
                {
                    "ragione_sociale": body.display_name,
                    "piva": body.tax_id,
                    "codice_fiscale": None,
                    "ruolo_soggetto": "cliente",
                    "provenienza": {"source": "e-practice"},
                },
                authorization=authorization,
                correlation_id=correlation_id,
            )
            company_payload = created.get("azienda", created)
            company_id = UUID(str(company_payload["id_azienda"]))
            if body.address or body.city:
                await client.create_site(
                    company_id,
                    {
                        "denominazione_sede": "Sede principale",
                        "indirizzo": body.address,
                        "citta": body.city,
                        "tipo": "legale",
                        "provenienza": {"source": "e-practice"},
                    },
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
            if body.email or body.phone:
                contact = await client.create_person(
                    {
                        "nome": "Referente",
                        "cognome": body.display_name,
                        "email": body.email,
                        "telefono": body.phone,
                        "provenienza": {"source": "e-practice"},
                    },
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
                await client.create_relation(
                    UUID(str(contact["id_persona"])),
                    company_id,
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
            return await _detail(
                client,
                "azienda",
                company_id,
                authorization,
                correlation_id,
            )

        parts = body.display_name.strip().split(maxsplit=1)
        created = await client.create_person(
            {
                "nome": parts[0] if parts else None,
                "cognome": parts[1] if len(parts) > 1 else None,
                "email": body.email,
                "telefono": body.phone,
                "provenienza": {"source": "e-practice"},
            },
            authorization=authorization,
            correlation_id=correlation_id,
        )
        person_id = UUID(str(created["id_persona"]))
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    return await _detail(
        client,
        "persona",
        person_id,
        authorization,
        correlation_id,
    )


@router.patch("/{target_type}/{target_id}", response_model=ContactDetail)
async def update_contact(
    target_type: ContactTargetType,
    target_id: UUID,
    body: ContactUpdateRequest,
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
) -> ContactDetail:
    existing = await _detail(
        client,
        target_type,
        target_id,
        authorization,
        correlation_id,
    )
    payload: dict[str, Any]
    if target_type == "azienda":
        payload = {}
        if "display_name" in body.model_fields_set:
            payload["ragione_sociale"] = body.display_name
        if "tax_id" in body.model_fields_set:
            payload["piva"] = body.tax_id
    else:
        parts = body.display_name.strip().split(maxsplit=1) if body.display_name else []
        payload = {}
        if "display_name" in body.model_fields_set:
            payload["nome"] = parts[0] if parts else None
            payload["cognome"] = parts[1] if len(parts) > 1 else None
        if "email" in body.model_fields_set:
            payload["email"] = body.email
        if "phone" in body.model_fields_set:
            payload["telefono"] = body.phone
    has_company_contact_update = target_type == "azienda" and (
        "email" in body.model_fields_set or "phone" in body.model_fields_set
    )
    has_site_update = target_type == "azienda" and (
        "address" in body.model_fields_set or "city" in body.model_fields_set
    )
    if not payload and not has_company_contact_update and not has_site_update:
        raise HTTPException(status_code=422, detail="Nessun campo da aggiornare")
    try:
        if payload:
            await client.update_subject(
                target_type,
                target_id,
                payload,
                authorization=authorization,
                correlation_id=correlation_id,
            )
        if has_site_update:
            site_payload: dict[str, Any] = {}
            if "address" in body.model_fields_set:
                site_payload["indirizzo"] = body.address
            if "city" in body.model_fields_set:
                site_payload["citta"] = body.city
            if existing.site_id:
                await client.update_site(
                    existing.site_id,
                    site_payload,
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
            else:
                await client.create_site(
                    target_id,
                    {
                        **site_payload,
                        "denominazione_sede": "Sede principale",
                        "tipo": "legale",
                        "provenienza": {"source": "e-practice"},
                    },
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
        if has_company_contact_update:
            contact_payload: dict[str, Any] = {}
            if "email" in body.model_fields_set:
                contact_payload["email"] = body.email
            if "phone" in body.model_fields_set:
                contact_payload["telefono"] = body.phone
            if existing.contact_person_id:
                await client.update_subject(
                    "persona",
                    existing.contact_person_id,
                    contact_payload,
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
            else:
                contact = await client.create_person(
                    {
                        "nome": "Referente",
                        "cognome": existing.display_name,
                        **contact_payload,
                        "provenienza": {"source": "e-practice"},
                    },
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
                await client.create_relation(
                    UUID(str(contact["id_persona"])),
                    target_id,
                    authorization=authorization,
                    correlation_id=correlation_id,
                )
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    return await _detail(
        client,
        target_type,
        target_id,
        authorization,
        correlation_id,
    )


@router.delete(
    "/{target_type}/{target_id}",
    response_class=Response,
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    target_type: ContactTargetType,
    target_id: UUID,
    client: Annotated[ContactsClient, Depends(get_contacts_client)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    correlation_id: Annotated[str | None, Header(alias="X-Correlation-Id")] = None,
) -> Response:
    try:
        await client.delete_subject(
            target_type,
            target_id,
            authorization=authorization,
            correlation_id=correlation_id,
        )
    except ContactsClientError as exc:
        _raise_contacts_error(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
