from fastapi.testclient import TestClient

from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": USER_ID}


def test_upload_creates_unattached() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/attachments",
            files={"file": ("bilancio_2025_bozza.pdf", b"demo-pdf", "application/pdf")},
            headers=HEADERS,
        )

        assert response.status_code == 201, response.text
        payload = response.json()
        assert payload["filename"] == "bilancio_2025_bozza.pdf"
        assert payload["mime_type"] == "application/pdf"
        assert payload["size_bytes"] == len(b"demo-pdf")
        assert payload["practice_id"] is None
        assert payload["phase_id"] is None


def test_attach_to_practice() -> None:
    with TestClient(app) as client:
        uploaded = client.post(
            "/api/attachments",
            files={"file": ("prima_nota.xlsx", b"demo-xlsx", "application/vnd.ms-excel")},
            headers=HEADERS,
        )
        assert uploaded.status_code == 201, uploaded.text
        practice_id = client.get("/api/practices?limit=1").json()["items"][0]["id"]

        attached = client.post(
            f"/api/attachments/{uploaded.json()['id']}/attach",
            headers=HEADERS,
            json={"practice_id": practice_id, "phase_id": None},
        )

        assert attached.status_code == 200, attached.text
        assert attached.json()["practice_id"] == practice_id

        duplicate = client.post(
            f"/api/attachments/{uploaded.json()['id']}/attach",
            headers=HEADERS,
            json={"practice_id": practice_id, "phase_id": None},
        )
        assert duplicate.status_code == 400


def test_delete_attachment() -> None:
    with TestClient(app) as client:
        uploaded = client.post(
            "/api/attachments",
            files={"file": ("elimina.pdf", b"demo", "application/pdf")},
            headers=HEADERS,
        )
        assert uploaded.status_code == 201, uploaded.text
        attachment_id = uploaded.json()["id"]

        deleted = client.delete(f"/api/attachments/{attachment_id}", headers=HEADERS)

        assert deleted.status_code == 204, deleted.text
        missing = client.delete(f"/api/attachments/{attachment_id}", headers=HEADERS)
        assert missing.status_code == 404
