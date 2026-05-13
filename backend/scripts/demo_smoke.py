"""Smoke test end-to-end del flusso demo.

Lancia il backend in test mode (TestClient, niente uvicorn) ed esercita
TUTTI gli endpoint che Codex/Kowy chiameranno dal frontend durante la demo
Studio Leali. Se uno fallisce, è meglio scoprirlo qui che durante la demo.

Uso (dalla cartella backend/):
    .venv/Scripts/python.exe scripts/demo_smoke.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

# Mario Bonometti — admin (UUID hardcoded dal seed di Codex F4)
MARIO_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": MARIO_ID}


def main() -> int:
    failures: list[str] = []

    with TestClient(app) as client:
        # 1. Health
        r = client.get("/api/health")
        check(r, 200, "GET /api/health", failures)

        # 2. Session login Mario
        r = client.post("/api/session", json={"user_id": MARIO_ID})
        check(r, 200, "POST /api/session (Mario)", failures)
        if r.status_code == 200:
            data = r.json()
            assert data["user"]["nome"] == "Mario", f"Expected Mario, got {data['user']['nome']}"

        # 3. Users list (per dropdown)
        r = client.get("/api/users", headers=HEADERS)
        check(r, 200, "GET /api/users", failures, lambda d: len(d) == 4, "4 users expected")

        # 4. Categories
        r = client.get("/api/categories", headers=HEADERS)
        check(
            r, 200, "GET /api/categories", failures, lambda d: len(d) == 5, "5 categories expected"
        )
        category_id = r.json()[0]["id"] if r.status_code == 200 else None

        # 5. Templates per categoria
        if category_id:
            r = client.get(f"/api/templates/{category_id}", headers=HEADERS)
            check(r, 200, "GET /api/templates/{cat}", failures, lambda d: len(d) > 0)

        # 6. Template preview (NUOVO endpoint per modal Nuova Pratica)
        if category_id:
            r = client.get(
                f"/api/templates/category/{category_id}/preview?apertura=2026-05-13",
                headers=HEADERS,
            )
            check(r, 200, "GET /api/templates/category/{id}/preview", failures)
            if r.status_code == 200:
                d = r.json()
                assert (
                    "phases" in d and "scadenza_calcolata" in d
                ), "Expected phases + scadenza_calcolata"
                print(
                    f"      -> {len(d['phases'])} fasi, scadenza={d['scadenza_calcolata']}, totale {d['total_duration_days']}g"
                )

        # 7. Clients list paginato
        r = client.get("/api/clients?limit=5", headers=HEADERS)
        check(r, 200, "GET /api/clients", failures)
        clients_total = r.json().get("total", 0) if r.status_code == 200 else 0

        # 8. Clients search (NUOVO endpoint per combobox modal)
        r = client.get("/api/clients/search?q=acciai&limit=5", headers=HEADERS)
        check(r, 200, "GET /api/clients/search?q=acciai", failures)
        if r.status_code == 200:
            hits = r.json()
            print(
                f"      -> {len(hits)} hit(s); first: {hits[0]['ragione_sociale'] if hits else 'n/a'}"
            )
            if hits:
                assert "practice_count" in hits[0], "Expected practice_count in hit"
                assert "cliente_dal_anno" in hits[0], "Expected cliente_dal_anno"

        # 9. Practices list
        r = client.get("/api/practices?limit=10", headers=HEADERS)
        check(r, 200, "GET /api/practices", failures)
        practice = r.json()["items"][0] if r.status_code == 200 and r.json()["items"] else None
        practice_id = practice["id"] if practice else None

        # 10. Practice detail enriched
        if practice_id:
            r = client.get(f"/api/practices/{practice_id}", headers=HEADERS)
            check(r, 200, "GET /api/practices/{id} (enriched)", failures)
            if r.status_code == 200:
                d = r.json()
                expected_keys = {
                    "practice",
                    "client",
                    "category",
                    "responsible",
                    "labels",
                    "phases",
                    "events",
                    "notes",
                    "attachments",
                    "collaborators",
                    "progress_pct",
                    "counts",
                }
                missing = expected_keys - set(d.keys())
                if missing:
                    failures.append(f"   PracticeDetail missing keys: {missing}")
                else:
                    print(
                        f"      -> {d['practice']['code']} {d['practice']['title'][:40]}... "
                        f"client={d['client']['ragione_sociale'] if d['client'] else None} "
                        f"phases={d['counts']['phases']} events={d['counts']['events']} "
                        f"progress={d['progress_pct']}%"
                    )

            # 10b. phases + events sub-endpoints
            r = client.get(f"/api/practices/{practice_id}/phases", headers=HEADERS)
            check(r, 200, "GET /api/practices/{id}/phases", failures)
            phases = r.json() if r.status_code == 200 else []

            r = client.get(f"/api/practices/{practice_id}/events", headers=HEADERS)
            check(r, 200, "GET /api/practices/{id}/events", failures)

            # 11. Phase complete (su una pending)
            pending = next((p for p in phases if p["status"] == "pending"), None)
            if pending:
                r = client.post(
                    f"/api/phases/{pending['id']}/complete",
                    json={"note": "Test demo smoke"},
                    headers=HEADERS,
                )
                check(r, 200, "POST /api/phases/{id}/complete (pending -> completed)", failures)
                if r.status_code == 200:
                    assert r.json()["status"] == "completed", "Status should be 'completed'"

            # 12. Phase skip (su un'altra pending)
            pending2 = next(
                (
                    p
                    for p in phases
                    if p["status"] == "pending" and (not pending or p["id"] != pending["id"])
                ),
                None,
            )
            if pending2:
                r = client.post(
                    f"/api/phases/{pending2['id']}/skip",
                    json={"skip_reason": "Smoke test"},
                    headers=HEADERS,
                )
                check(r, 200, "POST /api/phases/{id}/skip", failures)

            # 13. Phase update (assignee)
            another_pending = next((p for p in phases if p["status"] == "pending"), None)
            if another_pending:
                r = client.put(
                    f"/api/phases/{another_pending['id']}",
                    json={"assignee_id": MARIO_ID},
                    headers=HEADERS,
                )
                # 409 se è già stata completata/skippata sopra
                if r.status_code not in (200, 409):
                    failures.append(f"   PUT /api/phases/{{id}} -> {r.status_code}")
                else:
                    print(f"      -> PUT phase {r.status_code}")

        # 14. Event POST
        if practice_id and phases:
            phase_with_status = phases[0]
            r = client.post(
                "/api/events",
                json={
                    "practice_id": practice_id,
                    "phase_id": phase_with_status["id"],
                    "event_type": "telefonata_in",
                    "title": "Smoke test telefonata cliente",
                    "description": "Test demo flow",
                    "event_date": "2026-05-13",
                    "event_time": "10:30:00",
                    "author_id": MARIO_ID,
                    "visual_position": "top",
                },
                headers=HEADERS,
            )
            check(r, 201, "POST /api/events", failures)

        # 15. Note POST
        if practice_id:
            r = client.post(
                "/api/notes",
                json={
                    "practice_id": practice_id,
                    "content": "Nota di smoke test",
                    "author_id": MARIO_ID,
                },
                headers=HEADERS,
            )
            check(r, 201, "POST /api/notes", failures)

        # 16. Dashboard enriched
        r = client.get("/api/dashboard", headers=HEADERS)
        check(r, 200, "GET /api/dashboard (enriched)", failures)
        if r.status_code == 200:
            d = r.json()
            print(
                f"      -> totale={d['totale_pratiche']} in_ritardo={d['pratiche_in_ritardo']} "
                f"top_urgenti={len(d['top_urgenti'])} ultime_attivita={len(d['ultime_attivita'])} "
                f"carico_per_utente={len(d['carico_per_utente'])}"
            )
            if d["top_urgenti"]:
                assert "client_ragione_sociale" in d["top_urgenti"][0]
                assert "responsible" in d["top_urgenti"][0]
            if d["ultime_attivita"]:
                assert "actor" in d["ultime_attivita"][0]
                assert "entity_label" in d["ultime_attivita"][0]
            if d["carico_per_utente"]:
                assert "load_pct" in d["carico_per_utente"][0]
                assert "user" in d["carico_per_utente"][0]
                assert "role_label" in d["carico_per_utente"][0]["user"]

        # 17. Search globale
        r = client.get("/api/search?q=bilancio&limit=10", headers=HEADERS)
        check(r, 200, "GET /api/search?q=bilancio", failures)

        # 18. Activity log
        r = client.get("/api/activity?limit=20", headers=HEADERS)
        check(r, 200, "GET /api/activity", failures)

        # 19. Practice create con template + reminders (NUOVO flag)
        if category_id and clients_total:
            r = client.get("/api/clients?limit=1", headers=HEADERS)
            client_for_test = r.json()["items"][0] if r.status_code == 200 else None
            if client_for_test:
                r = client.post(
                    "/api/practices",
                    json={
                        "client_id": client_for_test["id"],
                        "category_id": category_id,
                        "title": "Smoke test practice — auto-create",
                        "apertura": "2026-05-13",
                        "priority": "media",
                        "create_default_reminders": True,
                    },
                    headers=HEADERS,
                )
                check(r, 201, "POST /api/practices (con create_default_reminders=True)", failures)
                if r.status_code == 201:
                    new_practice = r.json()
                    print(
                        f"      -> created {new_practice['code']}, {len(new_practice['phase_ids'])} phases"
                    )
                    # verifica che reminders siano stati creati
                    r2 = client.get("/api/reminders?status=pending", headers=HEADERS)
                    if r2.status_code == 200:
                        new_reminders = [
                            rem
                            for rem in r2.json()
                            if rem["practice_id"] == new_practice["practice_id"]
                        ]
                        print(f"      -> {len(new_reminders)} reminders auto-created")

    # ---- summary ----
    print()
    print("=" * 60)
    if not failures:
        print(" SMOKE TEST DEMO FLOW: ALL OK")
        return 0
    else:
        print(f" SMOKE TEST DEMO FLOW: {len(failures)} FAILURES")
        for f in failures:
            print(f" - {f}")
        return 1


def check(
    r,  # type: ignore[no-untyped-def]
    expected: int,
    name: str,
    failures: list[str],
    body_check=None,  # type: ignore[no-untyped-def]
    body_check_msg: str = "",
) -> None:
    if r.status_code != expected:
        body = ""
        try:
            body = json.dumps(r.json())[:200]
        except Exception:
            body = r.text[:200]
        failures.append(f"   {name} -> expected {expected}, got {r.status_code}: {body}")
        print(f"FAIL  {name} -> {r.status_code} (expected {expected})")
        return
    if body_check is not None and not body_check(r.json()):
        failures.append(f"   {name} body check failed: {body_check_msg}")
        print(f"FAIL  {name} body check: {body_check_msg}")
        return
    print(f"OK    {name}")


if __name__ == "__main__":
    sys.exit(main())
