from fastapi.testclient import TestClient

from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": USER_ID}


def test_update_note_changes_content() -> None:
    with TestClient(app) as client:
        practices = client.get("/api/practices?limit=1").json()["items"]
        practice_id = practices[0]["id"]
        phase_id = client.get(f"/api/practices/{practice_id}/phases").json()[0]["id"]
        created = client.post(
            "/api/notes",
            headers=HEADERS,
            json={
                "practice_id": practice_id,
                "phase_id": phase_id,
                "event_id": None,
                "content": "Nota iniziale",
                "author_id": USER_ID,
            },
        )
        assert created.status_code == 201, created.text

        updated = client.put(
            f"/api/notes/{created.json()['id']}",
            headers=HEADERS,
            json={"content": "Nota aggiornata"},
        )

        assert updated.status_code == 200, updated.text
        assert updated.json()["content"] == "Nota aggiornata"
