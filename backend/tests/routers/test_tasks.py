"""Test del router /api/tasks — oggetto Task assegnabile (EPC2-01, gap #2 Kowy Caso 2).

Copre CRUD + Kanban e i controlli di integrita' chiesti in review (fase della stessa
pratica, assegnatario reale, titolo non vuoto, normalizzazione 'completato', activity log).
"""

from fastapi.testclient import TestClient

from app.main import app

_SEED_USER = "11111111-1111-4111-8111-000000000003"  # utente del seed (assegnatario valido)


def _practice_ids(client: TestClient) -> list[str]:
    data = client.get("/api/practices").json()
    items = data["items"] if isinstance(data, dict) else data
    return [str(p["id"]) for p in items]


def _a_phase_id_of(client: TestClient, practice_id: str) -> str | None:
    """Un id fase appartenente alla pratica (per il test cross-pratica). None se assenti."""
    detail = client.get(f"/api/practices/{practice_id}").json()
    phases = detail.get("phases", []) if isinstance(detail, dict) else []
    for ph in phases:
        node = ph.get("phase", ph) if isinstance(ph, dict) else {}
        if node.get("id"):
            return str(node["id"])
    return None


def test_task_crud_e_kanban() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        created = client.post(
            "/api/tasks",
            json={
                "practice_id": pid,
                "title": "Preparare bozza 730",
                "assignee_id": _SEED_USER,
                "priority": "alta",
                "due_date": "2026-07-20",
            },
        )
        assert created.status_code == 201, created.text
        task = created.json()
        assert task["status"] == "da_fare"
        assert task["completion_pct"] == 0
        tid = task["id"]

        patched = client.patch(
            f"/api/tasks/{tid}", json={"status": "in_corso", "completion_pct": 40}
        )
        assert patched.status_code == 200
        assert patched.json()["status"] == "in_corso"
        assert patched.json()["completion_pct"] == 40

        in_corso = client.get("/api/tasks?status=in_corso").json()
        assert any(t["id"] == tid for t in in_corso)

        assert client.delete(f"/api/tasks/{tid}").status_code == 204


def test_task_validazione_e_not_found() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        tid = client.post("/api/tasks", json={"practice_id": pid, "title": "t"}).json()["id"]
        # % fuori range -> 422 (validazione di request)
        assert client.patch(f"/api/tasks/{tid}", json={"completion_pct": 150}).status_code == 422
        # pratica inesistente -> 404
        assert (
            client.post(
                "/api/tasks",
                json={"practice_id": "00000000-0000-4000-8000-000000000000", "title": "x"},
            ).status_code
            == 404
        )
        assert client.delete(f"/api/tasks/{tid}").status_code == 204
        assert client.get(f"/api/tasks/{tid}").status_code == 404


def test_task_titolo_obbligatorio_non_vuoto() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        assert client.post("/api/tasks", json={"practice_id": pid, "title": ""}).status_code == 422
        assert (
            client.post("/api/tasks", json={"practice_id": pid, "title": "   "}).status_code == 422
        )


def test_task_assegnatario_deve_esistere() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        r = client.post(
            "/api/tasks",
            json={
                "practice_id": pid,
                "title": "t",
                "assignee_id": "99999999-9999-4999-8999-999999999999",
            },
        )
        assert r.status_code == 422, r.text


def test_task_fase_di_altra_pratica_rifiutata() -> None:
    with TestClient(app) as client:
        pids = _practice_ids(client)
        # fase inesistente -> 404
        r404 = client.post(
            "/api/tasks",
            json={
                "practice_id": pids[0],
                "title": "t",
                "phase_id": "00000000-0000-4000-8000-000000000000",
            },
        )
        assert r404.status_code == 404, r404.text
        # fase di UN'ALTRA pratica -> 422 (se il seed ha almeno 2 pratiche con fasi)
        other_phase = None
        for other in pids[1:]:
            other_phase = _a_phase_id_of(client, other)
            if other_phase:
                break
        if other_phase:
            r422 = client.post(
                "/api/tasks",
                json={"practice_id": pids[0], "title": "t", "phase_id": other_phase},
            )
            assert r422.status_code == 422, r422.text


def test_task_completato_normalizzato() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        r = client.post(
            "/api/tasks",
            json={"practice_id": pid, "title": "chiudo subito", "status": "completato"},
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["completion_pct"] == 100
        assert body["completed_at"] is not None


def test_task_scrive_activity_log() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        tid = client.post("/api/tasks", json={"practice_id": pid, "title": "loggami"}).json()["id"]
        activity = client.get("/api/activity").json()
        rows = activity["items"] if isinstance(activity, dict) else activity
        assert any(
            row.get("entity_type") == "task" and str(row.get("entity_id")) == tid for row in rows
        ), "la creazione del task deve comparire nell'activity log"


def test_task_riapertura_azzera_completamento() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        tid = client.post(
            "/api/tasks",
            json={"practice_id": pid, "title": "chiudo subito", "status": "completato"},
        ).json()["id"]
        # riapertura: la data di completamento si azzera e il % torna a 0
        reopened = client.patch(f"/api/tasks/{tid}", json={"status": "in_corso"}).json()
        assert reopened["status"] == "in_corso"
        assert reopened["completed_at"] is None
        assert reopened["completion_pct"] == 0


def test_task_assegnatario_solo_interno_attivo() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        users = client.get("/api/users").json()
        rows = users["items"] if isinstance(users, dict) else users
        non_interno = next(
            (u for u in rows if u.get("role") == "esterno" or u.get("status") != "attivo"),
            None,
        )
        if non_interno is not None:
            r = client.post(
                "/api/tasks",
                json={"practice_id": pid, "title": "t", "assignee_id": str(non_interno["id"])},
            )
            assert r.status_code == 422, r.text
