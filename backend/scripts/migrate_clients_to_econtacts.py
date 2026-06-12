"""Migra idempotentemente i Client V0 verso E.Contacts.

Il mapping prodotto e' un artefatto di ambiente: non va usato come fonte
anagrafica e non deve essere committato con UUID di produzione.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

import httpx


def _args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    parser.add_argument("--seed", default="../data/seed.json")
    parser.add_argument("--output", default="../data/econtacts-target-map.local.json")
    parser.add_argument(
        "--apply-seed",
        action="store_true",
        help="Aggiunge target_type/target_id alle pratiche seed mantenendo client_id come rollback.",
    )
    return parser.parse_args()


async def _request(
    client: httpx.AsyncClient,
    method: str,
    path: str,
    **kwargs: Any,
) -> Any:
    response = await client.request(method, path, **kwargs)
    response.raise_for_status()
    return response.json()


async def _find_existing(
    client: httpx.AsyncClient,
    record: dict[str, Any],
) -> dict[str, Any] | None:
    if record["type"] == "persona_fisica" and record.get("email"):
        results = await _request(
            client,
            "GET",
            "/soggetti/ricerca",
            params={"email": record["email"], "limit": 1},
        )
    elif record.get("piva"):
        results = await _request(
            client,
            "GET",
            "/soggetti/ricerca",
            params={"piva": record["piva"], "limit": 1},
        )
    else:
        return None
    if not results:
        return None
    candidate = results[0]
    if candidate.get("confidenza") != 1.0:
        return None
    if not str(candidate.get("tipo_match", "")).startswith("esatto_"):
        return None
    return candidate if candidate.get("id_soggetto") else None


async def _create_subject(
    client: httpx.AsyncClient,
    record: dict[str, Any],
) -> tuple[str, str]:
    if record["type"] == "persona_fisica":
        parts = record["ragione_sociale"].split(maxsplit=1)
        created = await _request(
            client,
            "POST",
            "/persone",
            json={
                "nome": parts[0] if parts else None,
                "cognome": parts[1] if len(parts) > 1 else None,
                "email": record.get("email"),
                "telefono": record.get("telefono"),
                "provenienza": {"source": "e-practice-v0", "client_code": record["code"]},
            },
        )
        return "persona", str(created["id_persona"])

    created = await _request(
        client,
        "POST",
        "/aziende",
        json={
            "ragione_sociale": record["ragione_sociale"],
            "piva": record.get("piva"),
            "codice_fiscale": record.get("cf"),
            "ruolo_soggetto": "cliente",
            "provenienza": {"source": "e-practice-v0", "client_code": record["code"]},
        },
    )
    company_id = str(created["azienda"]["id_azienda"])
    if record.get("indirizzo_sede"):
        await _request(
            client,
            "POST",
            f"/aziende/{company_id}/sedi",
            json={
                "denominazione_sede": "Sede principale",
                "indirizzo": record["indirizzo_sede"],
                "tipo": "operativa",
                "provenienza": {"source": "e-practice-v0"},
            },
        )
    return "azienda", company_id


async def main() -> None:
    args = _args()
    seed_path = Path(args.seed).resolve()
    output_path = Path(args.output).resolve()
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    mapping: dict[str, dict[str, str]] = {}

    async with httpx.AsyncClient(base_url=args.base_url, timeout=10) as client:
        for record in seed["clients"]:
            existing = await _find_existing(client, record)
            if existing is not None:
                target_type = str(existing["tipo_soggetto"])
                target_id = str(existing["id_soggetto"])
            else:
                target_type, target_id = await _create_subject(client, record)
            mapping[str(record["id"])] = {
                "client_code": record["code"],
                "target_type": target_type,
                "target_id": target_id,
            }
            print(f"{record['code']} -> {target_type}:{target_id}")

    output_path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Mapping locale scritto in {output_path}")
    if args.apply_seed:
        migrated = 0
        targets_by_practice: dict[str, dict[str, str]] = {}
        for practice in seed["practices"]:
            target = mapping.get(str(practice.get("client_id")))
            if target is None:
                continue
            practice["target_type"] = target["target_type"]
            practice["target_id"] = target["target_id"]
            targets_by_practice[str(practice["id"])] = target
            migrated += 1
        migrated_events = 0
        for event in seed["practice_events"]:
            target = targets_by_practice.get(str(event.get("practice_id")))
            if target is None:
                continue
            event["participant_type"] = target["target_type"]
            event["participant_id"] = target["target_id"]
            migrated_events += 1
        seed_path.write_text(
            f"{json.dumps(seed, ensure_ascii=False, indent=2)}\n",
            encoding="utf-8",
        )
        print(
            "Seed aggiornato: "
            f"{migrated} pratiche e {migrated_events} eventi collegati a E.Contacts"
        )


if __name__ == "__main__":
    asyncio.run(main())
