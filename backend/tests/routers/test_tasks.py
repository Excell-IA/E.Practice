"""Test del router /api/tasks — oggetto Task assegnabile (EPC2-01, gap #2 Kowy Caso 2)."""

from fastapi.testclient import TestClient

from app.main import app


def _first_practice_id(client: TestClient) -> str:
    """Un id pratica reale dal seed (la lista puo' essere Page{items} o lista nuda)."""
    data = client.get("/api/practices").json()
    items = data["items"] if isinstance(data, dict) else data
    return str(items[0]["id"])


def test_task_crud_e_kanban() -> None:
    with TestClient(app) as client:
        pid = _first_practice_id(client)
        created = client.post(
            "/api/tasks",
            json={
                "practice_id": pid,
                "title": "Preparare bozza 730",
                "priority": "alta",
                "due_date": "2026-07-20",
            },
        )
        assert created.status_code == 201, created.text
        task = created.json()
        assert task["status"] == "da_fare"
        assert task["completion_pct"] == 0
        tid = task["id"]

        # spostamento sulla colonna Kanban + avanzamento
        patched = client.patch(
            f"/api/tasks/{tid}", json={"status": "in_corso", "completion_pct": 40}
        )
        assert patched.status_code == 200
        assert patched.json()["status"] == "in_corso"
        assert patched.json()["completion_pct"] == 40

        # filtro per stato (colonna Kanban)
        in_corso = client.get("/api/tasks?status=in_corso").json()
        assert any(t["id"] == tid for t in in_corso)

        assert client.delete(f"/api/tasks/{tid}").status_code == 204


def test_task_validazione_e_not_found() -> None:
    with TestClient(app) as client:
        pid = _first_practice_id(client)
        tid = client.post("/api/tasks", json={"practice_id": pid, "title": "t"}).json()["id"]

        # % fuori range -> 422
        assert client.patch(f"/api/tasks/{tid}", json={"completion_pct": 150}).status_code == 422
        # pratica inesistente -> 404
        assert (
            client.post(
                "/api/tasks",
                json={"practice_id": "00000000-0000-4000-8000-000000000000", "title": "x"},
            ).status_code
            == 404
        )
        # delete + get successivo -> 404
        assert client.delete(f"/api/tasks/{tid}").status_code == 204
        assert client.get(f"/api/tasks/{tid}").status_code == 404
