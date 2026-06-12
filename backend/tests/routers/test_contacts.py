from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient

from app.deps import get_contacts_client
from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"


class FakeContactsClient:
    created_person = False
    created_relation = False
    created_site = False

    async def list_subjects(self, **_kwargs: Any) -> list[dict[str, Any]]:
        return [
            {
                "id_soggetto": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "tipo_soggetto": "azienda",
                "denominazione": "Acme SRL",
                "piva": "01234567890",
                "email_principale": "info@acme.test",
                "stato_record": "operativo",
                "ruolo_soggetto": "cliente",
            }
        ]

    async def search(self, _query: str, **_kwargs: Any) -> list[dict[str, Any]]:
        return [
            {
                "id_soggetto": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "tipo_soggetto": "azienda",
                "anteprima": "Acme SRL",
                "confidenza": 0.8,
                "tipo_match": "fuzzy_nome",
            }
        ]

    async def get_subject(
        self,
        _target_type: str,
        target_id: UUID,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        return {
            "azienda": {
                "id_azienda": str(target_id),
                "ragione_sociale": "Acme SRL",
                "piva": "01234567890",
                "codice_fiscale": None,
                "ruolo_soggetto": "cliente",
                "stato_record": "operativo",
            },
            "sedi": [
                {
                    "id_sede": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    "citta": "Brescia",
                    "indirizzo": "Via Roma 1",
                }
            ],
            "persone": [
                {
                    "persona": {
                        "id_persona": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                        "email": "info@acme.test",
                        "telefono": "0301234567",
                    }
                }
            ],
        }

    async def create_company(self, _payload: dict[str, Any], **_kwargs: Any) -> dict[str, Any]:
        return {
            "azienda": {
                "id_azienda": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            }
        }

    async def create_site(
        self,
        _company_id: UUID,
        _payload: dict[str, Any],
        **_kwargs: Any,
    ) -> dict[str, Any]:
        self.created_site = True
        return {"id_sede": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}

    async def create_person(self, _payload: dict[str, Any], **_kwargs: Any) -> dict[str, Any]:
        self.created_person = True
        return {"id_persona": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"}

    async def create_relation(
        self,
        _person_id: UUID,
        _company_id: UUID,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        self.created_relation = True
        return {"id_relazione": "dddddddd-dddd-4ddd-8ddd-dddddddddddd"}


def test_contacts_proxy_maps_econtacts_contract() -> None:
    app.dependency_overrides[get_contacts_client] = lambda: FakeContactsClient()
    try:
        with TestClient(app) as client:
            response = client.get("/api/contacts", headers={"X-User-Id": USER_ID})
            assert response.status_code == 200
            assert response.json()[0]["display_name"] == "Acme SRL"

            search = client.get(
                "/api/contacts/search?q=acme",
                headers={"X-User-Id": USER_ID},
            )
            assert search.status_code == 200
            assert search.json()[0]["display_name"] == "Acme SRL"

            detail = client.get(
                "/api/contacts/azienda/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                headers={"X-User-Id": USER_ID},
            )
            assert detail.status_code == 200
            assert detail.json()["city"] == "Brescia"
            assert detail.json()["source"] == "econtacts"
    finally:
        app.dependency_overrides.pop(get_contacts_client, None)


def test_create_company_persists_site_and_primary_contact() -> None:
    fake = FakeContactsClient()
    app.dependency_overrides[get_contacts_client] = lambda: fake
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/contacts",
                headers={"X-User-Id": USER_ID},
                json={
                    "address": "Via Roma 1",
                    "city": "Brescia",
                    "display_name": "Acme SRL",
                    "email": "info@acme.test",
                    "phone": "0301234567",
                    "target_type": "azienda",
                    "tax_id": "01234567890",
                },
            )
            assert response.status_code == 201
            assert response.json()["site_id"] == "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
            assert response.json()["contact_person_id"] == ("cccccccc-cccc-4ccc-8ccc-cccccccccccc")
            assert fake.created_site is True
            assert fake.created_person is True
            assert fake.created_relation is True
    finally:
        app.dependency_overrides.pop(get_contacts_client, None)
