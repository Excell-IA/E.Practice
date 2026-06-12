from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"
CATEGORY_ID = "22222222-2222-4222-8222-000000000003"


def test_ensure_practice_is_lazy_and_idempotent() -> None:
    target_id = str(uuid4())
    payload = {
        "target_type": "azienda",
        "target_id": target_id,
        "category_id": CATEGORY_ID,
        "title": "Relazione Acme",
        "apertura": "2026-06-12",
    }
    headers = {"X-User-Id": USER_ID}

    with TestClient(app) as client:
        first = client.post("/api/practices/ensure", headers=headers, json=payload)
        second = client.post("/api/practices/ensure", headers=headers, json=payload)

        assert first.status_code == 200
        assert first.json()["created"] is True
        assert second.status_code == 200
        assert second.json()["created"] is False
        assert second.json()["practice"]["id"] == first.json()["practice"]["id"]

        listed = client.get(
            f"/api/practices?target_type=azienda&target_id={target_id}",
            headers=headers,
        )
        assert listed.status_code == 200
        assert listed.json()["total"] == 1
