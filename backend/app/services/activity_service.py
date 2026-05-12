"""ActivityService — wrapper per scrivere su `activity_log` con consistenza.

V0: ogni router che modifica entità chiama `log()` esplicitamente. V1+:
useremo un decorator `@logged_activity(action, entity)` su gli handler.

L'activity_log è **immutabile** (mai UPDATE/DELETE).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.logging_setup import get_logger
from app.models import (
    ActivityAction,
    ActivityEntityType,
    ActivityLog,
    ActivityMetadata,
)
from app.repositories.base import Repository

log = get_logger(__name__)


class ActivityService:
    """Scrive entry nel `activity_log` in modo type-safe."""

    def __init__(self, repo: Repository[ActivityLog]) -> None:
        self._repo = repo

    async def log(
        self,
        *,
        actor_id: UUID | str,
        action: ActivityAction,
        entity_type: ActivityEntityType,
        entity_id: UUID | str,
        practice_id: UUID | str | None = None,
        metadata: ActivityMetadata | dict[str, Any] | None = None,
    ) -> ActivityLog:
        entry = ActivityLog(
            id=uuid4(),
            actor_id=UUID(str(actor_id)),
            action=action,
            entity_type=entity_type,
            entity_id=UUID(str(entity_id)),
            practice_id=UUID(str(practice_id)) if practice_id else None,
            metadata=metadata if isinstance(metadata, dict) else metadata,
            timestamp=datetime.now(UTC),
        )
        created = await self._repo.create(entry)
        log.info(
            "activity_logged",
            actor_id=str(actor_id),
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
        )
        return created
