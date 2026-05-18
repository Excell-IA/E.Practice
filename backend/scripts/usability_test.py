"""Test usability / smoke contro un endpoint reale.

Simula un utente vero (Mario, titolare studio) che esegue il flusso completo
sulla demo, misurando il tempo di ogni operazione e i payload. Da lanciare
contro localhost in dev o contro la URL pubblica Render dopo il deploy.

Uso:
    # locale (default)
    .venv/Scripts/python.exe scripts/usability_test.py

    # produzione
    .venv/Scripts/python.exe scripts/usability_test.py https://e-practice-backend.onrender.com

Output: tabella per step (label, status, ms, kb) + statistiche aggregate
(min/p50/p95/max) + verifica integrita' funzionale.
"""

from __future__ import annotations

import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

MARIO_ID = "11111111-1111-4111-8111-000000000001"
HEADERS = {"X-User-Id": MARIO_ID, "Content-Type": "application/json", "Accept": "application/json"}


@dataclass
class Step:
    label: str
    method: str
    path: str
    status: int
    elapsed_ms: float
    size_kb: float
    ok: bool


def request(
    base: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> tuple[int, bytes, float]:
    url = f"{base}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=HEADERS)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read()
            status = resp.getcode()
    except urllib.error.HTTPError as err:
        payload = err.read()
        status = err.code
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    return status, payload, elapsed_ms


def record(
    steps: list[Step],
    label: str,
    method: str,
    path: str,
    status: int,
    payload: bytes,
    elapsed_ms: float,
    expected: int = 200,
) -> None:
    size_kb = len(payload) / 1024.0
    steps.append(
        Step(
            label=label,
            method=method,
            path=path,
            status=status,
            elapsed_ms=elapsed_ms,
            size_kb=size_kb,
            ok=status == expected,
        )
    )


def main() -> int:
    base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8001"
    print(f"\n  Target: {base}\n  User : Mario Bonometti (admin)\n")

    steps: list[Step] = []

    # 1. Health
    s, p, ms = request(base, "GET", "/healthz")
    record(steps, "health", "GET", "/healthz", s, p, ms)

    # 2. Session login (POST opzionale, fa anche GET)
    s, p, ms = request(base, "GET", "/api/users")
    record(steps, "lista utenti studio", "GET", "/api/users", s, p, ms)

    # 3. Home / dashboard data
    s, p, ms = request(base, "GET", "/api/dashboard")
    record(steps, "dashboard KPI", "GET", "/api/dashboard", s, p, ms)

    # 4. Rubrica clienti (q deve essere non vuoto, min_length=1)
    s, p, ms = request(base, "GET", "/api/clients/search?q=a&limit=10")
    record(steps, "rubrica clienti (cerca 'a')", "GET", "/api/clients/search", s, p, ms)

    # 5. Elenco pratiche (con progress_pct calcolato)
    s, p, ms = request(base, "GET", "/api/practices?limit=20&offset=0")
    record(steps, "elenco pratiche con progress", "GET", "/api/practices", s, p, ms)

    if not p:
        print("ABORT: lista pratiche vuota, controlla seed e backend")
        return 1
    practices_payload = json.loads(p)
    items = practices_payload.get("items", [])
    if not items:
        print("ABORT: nessuna pratica nel seed")
        return 1
    first_id = items[0]["id"]
    first_code = items[0]["code"]

    # 6. Dettaglio pratica aggregato
    s, p, ms = request(base, "GET", f"/api/practices/{first_id}")
    record(steps, f"dettaglio pratica {first_code}", "GET", "/api/practices/{id}", s, p, ms)
    detail = json.loads(p) if p else {}
    phases = [item["phase"] for item in detail.get("phases", [])]
    pending_phase = next(
        (ph for ph in phases if ph["status"] in ("pending", "in_progress")),
        None,
    )

    # 7. Modifica stato di una fase a in_progress (idempotente se già)
    if pending_phase:
        phase_id = pending_phase["id"]
        s, p, ms = request(
            base,
            "POST",
            f"/api/phases/{phase_id}/status",
            body={"status": "in_progress"},
        )
        record(
            steps,
            f"set_phase_status in_progress {pending_phase['order_index']}",
            "POST",
            "/api/phases/{id}/status",
            s,
            p,
            ms,
        )

    # 8. Aggiunta nota (al volo, no phase)
    note_body = {
        "practice_id": first_id,
        "author_id": MARIO_ID,
        "content": f"Nota usability test {datetime.utcnow().isoformat()}",
    }
    s, p, ms = request(
        base,
        "POST",
        "/api/notes",
        body=note_body,
    )
    record(steps, "crea nota generale", "POST", "/api/notes", s, p, ms, expected=201)
    new_note_id = json.loads(p).get("id") if p and s == 201 else None

    # 9. Aggiunta evento (telefonata)
    if pending_phase:
        event_body = {
            "practice_id": first_id,
            "phase_id": pending_phase["id"],
            "author_id": MARIO_ID,
            "event_type": "telefonata_in",
            "title": "Call cliente — usability test",
            "description": "Verifica latenze creazione evento",
            "event_date": datetime.utcnow().date().isoformat(),
            "visual_position": "top",
        }
        s, p, ms = request(base, "POST", "/api/events", body=event_body)
        record(steps, "crea evento call", "POST", "/api/events", s, p, ms, expected=201)

    # 10. Crea pratica nuova end-to-end (wizard)
    categories = json.loads(request(base, "GET", "/api/categories")[1] or b"[]")
    if not categories:
        print("ABORT: nessuna categoria nel seed")
        return 1
    cat_id = categories[0]["id"]
    apertura = datetime.utcnow().date().isoformat()
    scadenza = (datetime.utcnow().date() + timedelta(days=30)).isoformat()
    create_body = {
        "client_id": items[0]["client_id"],
        "category_id": cat_id,
        "title": f"Pratica test {datetime.utcnow().strftime('%H%M%S')}",
        "description": "Pratica creata dal test usability — eliminala se ti capita",
        "apertura": apertura,
        "scadenza": scadenza,
        "priority": "media",
        "collaborator_ids": [],
        "label_ids": [],
        "create_default_reminders": False,
        "phase_overrides": [],
    }
    s, p, ms = request(base, "POST", "/api/practices", body=create_body)
    record(steps, "crea pratica nuova", "POST", "/api/practices", s, p, ms, expected=201)
    new_practice_id = None
    if s == 201 and p:
        new_practice_id = json.loads(p).get("practice_id")

    # 11. Cancella la pratica appena creata (cleanup)
    if new_practice_id:
        s, p, ms = request(base, "DELETE", f"/api/practices/{new_practice_id}")
        record(
            steps,
            "elimina pratica test (cleanup)",
            "DELETE",
            "/api/practices/{id}",
            s,
            p,
            ms,
            expected=204,
        )

    # 12. Cancella la nota di test (cleanup)
    if new_note_id:
        s, p, ms = request(base, "DELETE", f"/api/notes/{new_note_id}")
        record(
            steps,
            "elimina nota test (cleanup)",
            "DELETE",
            "/api/notes/{id}",
            s,
            p,
            ms,
            expected=204,
        )

    # --- Report ---
    print(f"  {'Step':<42} {'Method':<7} {'Status':<7} {'ms':>9} {'kb':>7} OK")
    print("  " + "-" * 80)
    for st in steps:
        ok_mark = "OK" if st.ok else "FAIL"
        print(
            f"  {st.label[:42]:<42} {st.method:<7} {st.status:<7} "
            f"{st.elapsed_ms:>9.1f} {st.size_kb:>7.2f} {ok_mark}"
        )

    times = [st.elapsed_ms for st in steps]
    if times:
        print("\n  Stats latenza (ms):")
        print(f"    min     = {min(times):.1f}")
        print(f"    p50     = {statistics.median(times):.1f}")
        if len(times) >= 5:
            print(f"    p95     = {statistics.quantiles(times, n=20)[18]:.1f}")
        print(f"    max     = {max(times):.1f}")
        print(f"    avg     = {statistics.mean(times):.1f}")
        print(f"    totale  = {sum(times):.1f}")

    failures = [st for st in steps if not st.ok]
    print(f"\n  Risultato: {len(steps) - len(failures)}/{len(steps)} step OK")
    if failures:
        print("  FALLITI:")
        for st in failures:
            print(f"    - {st.label}: status {st.status}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
