"""Load and validate the V0 demo seed dataset."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, TypeAlias, cast

import structlog
from pydantic import BaseModel, ValidationError

from app.models import (
    ActivityLog,
    Attachment,
    Category,
    Client,
    ClientLabel,
    Label,
    Note,
    PhaseTemplate,
    Practice,
    PracticeEvent,
    PracticeLabel,
    PracticePhase,
    Reminder,
    User,
)
from app.repositories.memory import InMemoryRepository
from app.services.tokenize import tokenize

logger = structlog.get_logger(__name__)

SeedRecord: TypeAlias = dict[str, Any]
SeedData: TypeAlias = dict[str, list[SeedRecord]]
RepositoryMap: TypeAlias = dict[str, InMemoryRepository[Any]]

REQUIRED_SEED_KEYS = (
    "users",
    "categories",
    "phase_templates",
    "labels",
    "clients",
    "practices",
    "practice_phases",
    "practice_events",
    "notes",
    "attachments",
    "reminders",
    "activity_log",
    "practice_labels",
    "client_labels",
)

MODEL_BY_KEY: dict[str, type[BaseModel]] = {
    "users": User,
    "categories": Category,
    "phase_templates": PhaseTemplate,
    "labels": Label,
    "clients": Client,
    "practices": Practice,
    "practice_phases": PracticePhase,
    "practice_events": PracticeEvent,
    "notes": Note,
    "attachments": Attachment,
    "reminders": Reminder,
    "activity_log": ActivityLog,
    "practice_labels": PracticeLabel,
    "client_labels": ClientLabel,
}


def _attach_bridge_id(item: BaseModel, key: str) -> BaseModel:
    bridge = cast(Any, item)
    if key == "practice_labels":
        value = f"{bridge.practice_id}:{bridge.label_id}"
    elif key == "client_labels":
        value = f"{bridge.client_id}:{bridge.label_id}"
    else:
        return item

    object.__setattr__(item, "id", value)
    return item


def load_seed_json(path: Path | str) -> SeedData:
    """Read seed.json and validate the required top-level lists."""

    seed_path = Path(path)
    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")

    try:
        raw = json.loads(seed_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Malformed seed JSON: {seed_path}: {exc}") from exc

    if not isinstance(raw, dict):
        raise ValueError("Malformed seed JSON: top-level value must be an object")

    missing = sorted(set(REQUIRED_SEED_KEYS) - set(raw))
    if missing:
        raise ValueError(f"Malformed seed JSON: missing keys: {', '.join(missing)}")

    unexpected = sorted(set(raw) - set(REQUIRED_SEED_KEYS))
    if unexpected:
        raise ValueError(f"Malformed seed JSON: unexpected keys: {', '.join(unexpected)}")

    for key in REQUIRED_SEED_KEYS:
        if not isinstance(raw[key], list):
            raise ValueError(f"Malformed seed JSON: '{key}' must be a list")
        for index, record in enumerate(raw[key]):
            if not isinstance(record, dict):
                raise ValueError(f"Malformed seed JSON: '{key}[{index}]' must be an object")

    return cast(SeedData, raw)


def populate_repositories(seed: dict[str, list[Any]], repos: RepositoryMap) -> None:
    """Validate seed records, tokenize practices, and replace repository contents."""

    missing_repos = sorted(set(REQUIRED_SEED_KEYS) - set(repos))
    if missing_repos:
        raise ValueError(f"Missing repositories for seed keys: {', '.join(missing_repos)}")

    client_ids = {str(record["id"]) for record in seed["clients"] if isinstance(record, dict)}
    for record in seed["practices"]:
        if not isinstance(record, dict):
            continue
        client_id = record.get("client_id")
        target_id = record.get("target_id")
        if client_id is not None and str(client_id) not in client_ids:
            raise ValueError(f"Practice references unknown client_id: {client_id}")
        subject_id = target_id or client_id
        if subject_id is None:
            raise ValueError("Practice requires client_id or target_id")
        record["client_token"] = tokenize(str(subject_id))

    for key in REQUIRED_SEED_KEYS:
        model = MODEL_BY_KEY[key]
        try:
            items = [_attach_bridge_id(model.model_validate(record), key) for record in seed[key]]
        except ValidationError as exc:
            raise ValueError(f"Invalid seed records for '{key}': {exc}") from exc

        repos[key]._seed_replace(items)
        logger.info("seed_loaded", entity=key, count=len(items))
