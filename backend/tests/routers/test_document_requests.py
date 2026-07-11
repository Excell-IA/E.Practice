"""Test del router /api/document-requests — checklist documenti (EPC2-07b, gap #1 Kowy Caso 2)."""

from fastapi.testclient import TestClient

from app.main import app


def _practice_ids(client: TestClient) -> list[str]:
    data = client.get("/api/practices").json()
    items = data["items"] if isinstance(data, dict) else data
    return [str(p["id"]) for p in items]


def _a_phase_id_of(client: TestClient, practice_id: str) -> str | None:
    detail = client.get(f"/api/practices/{practice_id}").json()
    phases = detail.get("phases", []) if isinstance(detail, dict) else []
    for ph in phases:
        node = ph.get("phase", ph) if isinstance(ph, dict) else {}
        if node.get("id"):
            return str(node["id"])
    return None


def test_docreq_crud_e_avanzamento_stato() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        created = client.post(
            "/api/document-requests",
            json={"practice_id": pid, "name": "Visura camerale", "due_date": "2026-07-25"},
        )
        assert created.status_code == 201, created.text
        item = created.json()
        assert item["status"] == "richiesto"
        assert item["received_at"] is None
        did = item["id"]

        # avanzamento a 'ricevuto' -> received_at valorizzata dal backend
        patched = client.patch(f"/api/document-requests/{did}", json={"status": "ricevuto"})
        assert patched.status_code == 200
        assert patched.json()["status"] == "ricevuto"
        assert patched.json()["received_at"] is not None

        # filtro per stato
        ricevuti = client.get("/api/document-requests?status=ricevuto").json()
        assert any(d["id"] == did for d in ricevuti)

        assert client.delete(f"/api/document-requests/{did}").status_code == 204
        assert client.get(f"/api/document-requests/{did}").status_code == 404


def test_docreq_nome_obbligatorio_e_pratica_inesistente() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        assert (
            client.post("/api/document-requests", json={"practice_id": pid, "name": ""}).status_code
            == 422
        )
        assert (
            client.post(
                "/api/document-requests", json={"practice_id": pid, "name": "   "}
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/document-requests",
                json={"practice_id": "00000000-0000-4000-8000-000000000000", "name": "x"},
            ).status_code
            == 404
        )


def test_docreq_riferimenti_incoerenti_rifiutati() -> None:
    with TestClient(app) as client:
        pids = _practice_ids(client)
        # fase inesistente -> 404
        assert (
            client.post(
                "/api/document-requests",
                json={
                    "practice_id": pids[0],
                    "name": "x",
                    "phase_id": "00000000-0000-4000-8000-000000000000",
                },
            ).status_code
            == 404
        )
        # allegato inesistente -> 404
        assert (
            client.post(
                "/api/document-requests",
                json={
                    "practice_id": pids[0],
                    "name": "x",
                    "attachment_id": "00000000-0000-4000-8000-000000000000",
                },
            ).status_code
            == 404
        )
        # fase di un'altra pratica -> 422
        other_phase = None
        for other in pids[1:]:
            other_phase = _a_phase_id_of(client, other)
            if other_phase:
                break
        if other_phase:
            r = client.post(
                "/api/document-requests",
                json={"practice_id": pids[0], "name": "x", "phase_id": other_phase},
            )
            assert r.status_code == 422, r.text


def test_docreq_scrive_activity_log() -> None:
    with TestClient(app) as client:
        pid = _practice_ids(client)[0]
        did = client.post(
            "/api/document-requests", json={"practice_id": pid, "name": "CU 2025"}
        ).json()["id"]
        activity = client.get("/api/activity").json()
        rows = activity["items"] if isinstance(activity, dict) else activity
        assert any(
            row.get("entity_type") == "document_request" and str(row.get("entity_id")) == did
            for row in rows
        )
