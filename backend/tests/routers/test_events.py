from fastapi.testclient import TestClient

from app.main import app

USER_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": USER_ID}


def test_update_event_changes_date() -> None:
    with TestClient(app) as client:
        practices = client.get("/api/practices?limit=1").json()["items"]
        practice_id = practices[0]["id"]
        phase_id = client.get(f"/api/practices/{practice_id}/phases").json()[0]["id"]
        created = client.post(
            "/api/events",
            headers=HEADERS,
            json={
                "practice_id": practice_id,
                "phase_id": phase_id,
                "event_type": "telefonata_out",
                "title": "Telefonata",
                "description": "Prima descrizione",
                "event_date": "2026-07-01",
                "event_time": None,
                "author_id": USER_ID,
                "visual_position": "top",
            },
        )
        assert created.status_code == 201, created.text

        updated = client.put(
            f"/api/events/{created.json()['id']}",
            headers=HEADERS,
            json={"event_date": "2026-08-01", "title": "Telefonata aggiornata"},
        )

        assert updated.status_code == 200, updated.text
        assert updated.json()["event_date"] == "2026-08-01"
        assert updated.json()["title"] == "Telefonata aggiornata"
