"""Mapper del contratto E.Contacts verso i modelli stabili E.Practice."""

from typing import Any

from app.models.contact import ContactDetail, ContactSummary


def grid_to_summary(item: dict[str, Any]) -> ContactSummary:
    return ContactSummary(
        target_id=item["id_soggetto"],
        target_type=item["tipo_soggetto"],
        display_name=item["denominazione"],
        tax_id=item.get("piva"),
        email=item.get("email_principale"),
        status=item.get("stato_record"),
        role=item.get("ruolo_soggetto"),
    )


def match_to_summary(item: dict[str, Any]) -> ContactSummary | None:
    if not item.get("id_soggetto") or not item.get("tipo_soggetto"):
        return None
    return ContactSummary(
        target_id=item["id_soggetto"],
        target_type=item["tipo_soggetto"],
        display_name=item.get("anteprima") or "Soggetto E.Contacts",
        confidence=item.get("confidenza"),
        match_type=item.get("tipo_match"),
    )


def company_to_detail(payload: dict[str, Any]) -> ContactDetail:
    company = payload["azienda"]
    sites = payload.get("sedi") or []
    people = payload.get("persone") or []
    primary_site = sites[0] if sites else {}
    primary_person = people[0].get("persona", {}) if people else {}
    return ContactDetail(
        target_id=company["id_azienda"],
        target_type="azienda",
        display_name=company["ragione_sociale"],
        tax_id=company.get("piva") or company.get("codice_fiscale"),
        email=primary_person.get("email"),
        phone=primary_person.get("telefono"),
        city=primary_site.get("citta"),
        address=primary_site.get("indirizzo"),
        site_id=primary_site.get("id_sede"),
        contact_person_id=primary_person.get("id_persona"),
        status=company.get("stato_record"),
        role=company.get("ruolo_soggetto"),
    )


def person_to_detail(payload: dict[str, Any]) -> ContactDetail:
    person = payload["persona"]
    companies = payload.get("aziende") or []
    company = companies[0].get("azienda", {}) if companies else {}
    display_name = " ".join(
        part for part in (person.get("nome"), person.get("cognome")) if part
    ).strip()
    return ContactDetail(
        target_id=person["id_persona"],
        target_type="persona",
        display_name=display_name or person.get("email") or "Persona",
        tax_id=None,
        email=person.get("email"),
        phone=person.get("telefono"),
        status=person.get("stato_record"),
        company_id=company.get("id_azienda"),
        contact_person_id=person.get("id_persona"),
    )
