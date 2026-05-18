from fastapi.testclient import TestClient

from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": USER_ID}


def test_create_user_duplicate_email_returns_409() -> None:
    with TestClient(app) as client:
        users = client.get("/api/users", headers=HEADERS).json()
        response = client.post(
            "/api/users",
            headers=HEADERS,
            json={
                "avatar_color": "#0284c7",
                "cognome": "Duplicato",
                "email": users[0]["email"].upper(),
                "nome": "Utente",
                "role": "senior",
                "status": "sospeso",
            },
        )

        assert response.status_code == 409, response.text


def test_delete_user_with_assignments_returns_409_counts() -> None:
    with TestClient(app) as client:
        user_id = "11111111-1111-4111-8111-000000000002"

        response = client.delete(f"/api/users/{user_id}", headers=HEADERS)

        assert response.status_code == 409, response.text
        payload = response.json()
        assert payload["practices_count"] > 0
        assert payload["phases_count"] > 0
