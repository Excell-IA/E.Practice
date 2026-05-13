"""Backfill practice phases in data/seed.json from category templates.

One-off utility for the V0 demo seed. It is intentionally deterministic and
idempotent: existing phase IDs for the same practice/order are preserved, while
missing phases get stable IDs from the next available demo tail.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SEED_PATH = ROOT / "data" / "seed.json"
PHASE_ID_PREFIX = "77777777-7777-4777-8777-"
ASSIGNEES = [
    "11111111-1111-4111-8111-000000000001",
    "11111111-1111-4111-8111-000000000002",
    "11111111-1111-4111-8111-000000000003",
    "11111111-1111-4111-8111-000000000004",
]


def parse_day(value: str) -> date:
    return date.fromisoformat(value)


def next_phase_tail(phases: list[dict[str, Any]]) -> int:
    tails: list[int] = []
    for phase in phases:
        phase_id = str(phase["id"])
        if phase_id.startswith(PHASE_ID_PREFIX):
            tail = phase_id.removeprefix(PHASE_ID_PREFIX)
            if tail.isdigit():
                tails.append(int(tail))
    return max(tails, default=0) + 1


def phase_id(tail: int) -> str:
    return f"{PHASE_ID_PREFIX}{tail:012d}"


def planned_ranges(
    start: date,
    end: date,
    templates: list[dict[str, Any]],
) -> list[tuple[date, date]]:
    """Spread template phases across the practice range using duration weights."""
    if not templates:
        return []
    span_days = max((end - start).days, len(templates))
    weights = [max(int(template.get("duration_days") or 1), 1) for template in templates]
    total_weight = sum(weights)
    ranges: list[tuple[date, date]] = []
    cursor = start
    elapsed_weight = 0
    for index, weight in enumerate(weights):
        elapsed_weight += weight
        if index == len(weights) - 1:
            phase_end = end
        else:
            offset = round((elapsed_weight / total_weight) * span_days)
            phase_end = max(cursor, min(start + timedelta(days=offset), end))
        ranges.append((cursor, phase_end))
        cursor = min(phase_end + timedelta(days=1), end)
    return ranges


def desired_templates(templates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Demo trees should be readable: use 4-6 phases per practice."""
    if len(templates) <= 6:
        return templates
    return templates[:6]


def build_phase(
    *,
    existing: dict[str, Any] | None,
    new_id: str,
    practice: dict[str, Any],
    template: dict[str, Any],
    order_index: int,
    planned_start: date,
    planned_end: date,
) -> dict[str, Any]:
    phase = dict(existing or {})
    phase.update(
        {
            "id": phase.get("id", new_id),
            "practice_id": practice["id"],
            "template_id": template["id"],
            "order_index": order_index,
            "name": template["name"],
            "description": phase.get("description") or template.get("description"),
            "assignee_id": phase.get("assignee_id")
            or ASSIGNEES[(order_index + int(practice["code"].rsplit("-", 1)[1])) % len(ASSIGNEES)],
            "planned_start": planned_start.isoformat(),
            "planned_end": planned_end.isoformat(),
            "actual_start": phase.get("actual_start"),
            "actual_end": phase.get("actual_end"),
            "status": phase.get("status") or ("in_progress" if order_index == 1 else "pending"),
            "skip_reason": phase.get("skip_reason"),
            "completed_by": phase.get("completed_by"),
            "completed_at": phase.get("completed_at"),
        }
    )
    return phase


def main() -> None:
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    templates_by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for template in seed["phase_templates"]:
        templates_by_category[template["category_id"]].append(template)
    for templates in templates_by_category.values():
        templates.sort(key=lambda item: item["order_index"])

    phases_by_practice: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for phase in seed["practice_phases"]:
        phases_by_practice[phase["practice_id"]].append(phase)
    for phases in phases_by_practice.values():
        phases.sort(key=lambda item: item["order_index"])

    tail = next_phase_tail(seed["practice_phases"])
    rebuilt: list[dict[str, Any]] = []
    changed = False

    for practice in seed["practices"]:
        templates = desired_templates(templates_by_category[practice["category_id"]])
        existing_by_order = {
            int(phase["order_index"]): phase for phase in phases_by_practice.get(practice["id"], [])
        }
        if len(existing_by_order) >= len(templates):
            rebuilt.extend(phases_by_practice.get(practice["id"], []))
            continue

        changed = True
        ranges = planned_ranges(
            parse_day(practice["apertura"]), parse_day(practice["scadenza"]), templates
        )
        for index, template in enumerate(templates, start=1):
            existing = existing_by_order.get(index)
            new_id = existing["id"] if existing else phase_id(tail)
            if existing is None:
                tail += 1
            planned_start, planned_end = ranges[index - 1]
            rebuilt.append(
                build_phase(
                    existing=existing,
                    new_id=new_id,
                    practice=practice,
                    template=template,
                    order_index=index,
                    planned_start=planned_start,
                    planned_end=planned_end,
                )
            )

    if changed:
        seed["practice_phases"] = rebuilt
        SEED_PATH.write_text(
            json.dumps(seed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    main()
