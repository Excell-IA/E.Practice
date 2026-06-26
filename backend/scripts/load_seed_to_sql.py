"""Carica il seed E.Practice nelle tabelle tenant E.Work `practice_*`.

Uso previsto da `backend/`:

    .venv/Scripts/python.exe scripts/load_seed_to_sql.py --dry-run
    .venv/Scripts/python.exe scripts/load_seed_to_sql.py

Lo script e' idempotente: usa gli UUID del seed e fa upsert per tabella.
Non crea utenti o clienti: E.Work auth ed E.Contacts restano le fonti
autorevoli. I riferimenti legacy `client_id` rimangono solo come compatibilita'
transitoria, senza foreign key.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError
from sqlalchemy import text

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.config import get_settings  # noqa: E402
from app.db import get_sql_session, schema_name_for  # noqa: E402
from app.models import (  # noqa: E402
    ActivityLog,
    Attachment,
    Category,
    Label,
    Note,
    PhaseTemplate,
    Practice,
    PracticeEvent,
    PracticeLabel,
    PracticePhase,
    Reminder,
)
from app.repositories.seed_loader import load_seed_json  # noqa: E402
from app.services.tokenize import tokenize  # noqa: E402


class SeedLoadError(RuntimeError):
    """Errore esplicito per seed non caricabile nel DB condiviso."""


def _args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--seed",
        default=None,
        help="Percorso seed.json. Default: Settings.seed_path relativo a backend/.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Valida seed e connessione/schema, ma non scrive righe.",
    )
    return parser.parse_args()


def _resolve_seed_path(raw: str | None) -> Path:
    if raw is not None:
        return Path(raw).resolve()
    return Path(get_settings().seed_path).resolve()


def _dump(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="python")


def _json(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def _validate_many(
    model: type[BaseModel], records: Iterable[dict[str, Any]], key: str
) -> list[Any]:
    try:
        return [model.model_validate(record) for record in records]
    except ValidationError as exc:
        raise SeedLoadError(f"Seed non valido per '{key}': {exc}") from exc


def _practice_row(item: Practice) -> dict[str, Any]:
    row = _dump(item)
    subject_id = item.target_id or item.client_id
    row["client_token"] = item.client_token or tokenize(str(subject_id))
    row["target_source"] = "econtacts" if item.target_id is not None else "legacy_client"
    return row


def _attachment_row(item: Attachment) -> dict[str, Any]:
    row = _dump(item)
    row["file_name"] = row.pop("filename")
    row["uploaded_at"] = row.pop("created_at")
    return row


def _activity_log_row(item: ActivityLog) -> dict[str, Any]:
    row = _dump(item)
    row["created_at"] = row.pop("timestamp")
    row["metadata"] = _json(row.get("metadata"))
    return row


def _note_row(item: Note) -> dict[str, Any]:
    row = _dump(item)
    if row.get("event_id") is not None:
        row["phase_id"] = None
    return row


async def _assert_schema_exists(session: Any) -> None:
    schema = schema_name_for(get_settings().ework_tenant_slug)
    result = await session.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = :schema AND table_name = 'practice_practices'"
        ),
        {"schema": schema},
    )
    if int(result.scalar_one()) != 1:
        raise SeedLoadError(
            f"Schema E.Work incompleto: manca {schema}.practice_practices. "
            "Serve prima il merge/apply della migration E.Work per PR155."
        )


async def _upsert_many(
    session: Any,
    *,
    table: str,
    rows: Sequence[dict[str, Any]],
    columns: Sequence[str],
    conflict_columns: Sequence[str] = ("id",),
    casts: dict[str, str] | None = None,
    revive_soft_deleted: bool = False,
) -> int:
    if not rows:
        return 0

    cast_by_column = casts or {}
    insert_columns = list(columns)
    if revive_soft_deleted:
        insert_columns.extend(["is_deleted", "deleted_at", "deleted_by", "deleted_reason"])

    insert_sql = ", ".join(insert_columns)
    value_parts = []
    for column in insert_columns:
        if column in cast_by_column:
            value_parts.append(cast_by_column[column].format(param=f":{column}"))
        else:
            value_parts.append(f":{column}")
    values_sql = ", ".join(value_parts)

    update_columns = [column for column in insert_columns if column not in conflict_columns]
    if update_columns:
        update_sql = ", ".join(f"{column} = EXCLUDED.{column}" for column in update_columns)
        conflict_sql = f"ON CONFLICT ({', '.join(conflict_columns)}) DO UPDATE SET {update_sql}"
    else:
        conflict_sql = f"ON CONFLICT ({', '.join(conflict_columns)}) DO NOTHING"

    statement = text(f"INSERT INTO {table} ({insert_sql}) VALUES ({values_sql}) {conflict_sql}")

    for raw_row in rows:
        row = {column: raw_row.get(column) for column in columns}
        if revive_soft_deleted:
            row.update(
                {
                    "is_deleted": False,
                    "deleted_at": None,
                    "deleted_by": None,
                    "deleted_reason": None,
                }
            )
        await session.execute(statement, row)
    return len(rows)


async def _load(seed_path: Path, *, dry_run: bool) -> dict[str, int]:
    seed = load_seed_json(seed_path)

    categories = [
        _dump(item) for item in _validate_many(Category, seed["categories"], "categories")
    ]
    phase_templates = [
        _dump(item)
        for item in _validate_many(PhaseTemplate, seed["phase_templates"], "phase_templates")
    ]
    labels = [_dump(item) for item in _validate_many(Label, seed["labels"], "labels")]
    practices = [
        _practice_row(item) for item in _validate_many(Practice, seed["practices"], "practices")
    ]
    phases = [
        _dump(item)
        for item in _validate_many(PracticePhase, seed["practice_phases"], "practice_phases")
    ]
    events = [
        _dump(item)
        for item in _validate_many(PracticeEvent, seed["practice_events"], "practice_events")
    ]
    notes = [_note_row(item) for item in _validate_many(Note, seed["notes"], "notes")]
    attachments = [
        _attachment_row(item)
        for item in _validate_many(Attachment, seed["attachments"], "attachments")
    ]
    reminders = [_dump(item) for item in _validate_many(Reminder, seed["reminders"], "reminders")]
    activity_log = [
        _activity_log_row(item)
        for item in _validate_many(ActivityLog, seed["activity_log"], "activity_log")
    ]
    practice_label_links = [
        _dump(item)
        for item in _validate_many(PracticeLabel, seed["practice_labels"], "practice_labels")
    ]

    counts = {
        "practice_categories": len(categories),
        "practice_phase_templates": len(phase_templates),
        "practice_labels": len(labels),
        "practice_practices": len(practices),
        "practice_phases": len(phases),
        "practice_events": len(events),
        "practice_notes": len(notes),
        "practice_attachments": len(attachments),
        "practice_reminders": len(reminders),
        "practice_activity_log": len(activity_log),
        "practice_label_links": len(practice_label_links),
    }

    async for session in get_sql_session():
        await _assert_schema_exists(session)
        if dry_run:
            return counts

        await _upsert_many(
            session,
            table="practice_categories",
            rows=categories,
            columns=("id", "name", "group_name", "icon", "color", "description", "active"),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_phase_templates",
            rows=phase_templates,
            columns=(
                "id",
                "category_id",
                "order_index",
                "name",
                "description",
                "duration_days",
                "default_role",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_labels",
            rows=labels,
            columns=("id", "name", "color", "scope", "description"),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_practices",
            rows=practices,
            columns=(
                "id",
                "code",
                "title",
                "description",
                "client_id",
                "client_token",
                "target_type",
                "target_id",
                "target_source",
                "category_id",
                "responsible_id",
                "apertura",
                "scadenza",
                "priority",
                "status",
                "completed_at",
                "created_at",
                "created_by",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_phases",
            rows=phases,
            columns=(
                "id",
                "practice_id",
                "template_id",
                "order_index",
                "name",
                "description",
                "assignee_id",
                "planned_start",
                "planned_end",
                "actual_start",
                "actual_end",
                "status",
                "skip_reason",
                "completed_by",
                "completed_at",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_events",
            rows=events,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_type",
                "title",
                "description",
                "event_date",
                "event_time",
                "author_id",
                "visual_position",
                "participant_type",
                "participant_id",
                "created_at",
            ),
        )
        await _upsert_many(
            session,
            table="practice_notes",
            rows=notes,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_id",
                "content",
                "author_id",
                "occurred_at",
                "created_at",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_attachments",
            rows=attachments,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "event_id",
                "file_name",
                "mime_type",
                "size_bytes",
                "storage_key",
                "source",
                "uploaded_by",
                "uploaded_at",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_reminders",
            rows=reminders,
            columns=(
                "id",
                "practice_id",
                "phase_id",
                "title",
                "target_date",
                "days_before",
                "recipient_id",
                "status",
                "created_at",
            ),
            revive_soft_deleted=True,
        )
        await _upsert_many(
            session,
            table="practice_activity_log",
            rows=activity_log,
            columns=(
                "id",
                "actor_id",
                "action",
                "entity_type",
                "entity_id",
                "practice_id",
                "metadata",
                "created_at",
            ),
            casts={"metadata": "CAST({param} AS jsonb)"},
        )
        await _upsert_many(
            session,
            table="practice_label_links",
            rows=practice_label_links,
            columns=("practice_id", "label_id"),
            conflict_columns=("practice_id", "label_id"),
        )
        await session.commit()
        return counts

    raise SeedLoadError("Sessione SQL non disponibile")


async def _main() -> None:
    args = _args()
    seed_path = _resolve_seed_path(args.seed)
    counts = await _load(seed_path, dry_run=bool(args.dry_run))
    mode = "dry_run_ok" if args.dry_run else "seed_sql_loaded"
    print(f"{mode}: {seed_path}")
    for table, count in counts.items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    asyncio.run(_main())
