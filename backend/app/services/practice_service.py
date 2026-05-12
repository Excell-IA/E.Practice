"""PracticeService — business logic per la creazione/avanzamento pratiche.

Orchestrazione attorno alle pratiche: instanzia fasi dal template,
gestisce avanzamento, archivia, calcola percentuali. I router restano sottili.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

from app.logging_setup import get_logger
from app.models import (
    CreatePracticeRequest,
    CreatePracticeResponse,
    PhaseTemplate,
    Practice,
    PracticePhase,
)
from app.repositories.base import NotFoundError, Repository
from app.services.activity_service import ActivityService
from app.services.tokenize import tokenize

log = get_logger(__name__)


class PracticeService:
    """Logica orchestrazione di alto livello sulle pratiche."""

    def __init__(
        self,
        practice_repo: Repository[Practice],
        template_repo: Repository[PhaseTemplate],
        phase_repo: Repository[PracticePhase],
        activity: ActivityService,
    ) -> None:
        self._practices = practice_repo
        self._templates = template_repo
        self._phases = phase_repo
        self._activity = activity

    async def _next_code(self) -> str:
        existing = await self._practices.list()
        year = datetime.now(UTC).year
        nums: list[int] = []
        for p in existing:
            if p.code and p.code.startswith(f"PR-{year}-"):
                tail = p.code.rsplit("-", 1)[1]
                if tail.isdigit():
                    nums.append(int(tail))
        return f"PR-{year}-{(max(nums, default=0) + 1):03d}"

    async def _templates_for_category(self, category_id: UUID) -> list[PhaseTemplate]:
        items = await self._templates.list(category_id=category_id)
        return sorted(items, key=lambda t: t.order_index)

    async def create_with_template(
        self,
        request: CreatePracticeRequest,
        current_user_id: str | UUID,
    ) -> CreatePracticeResponse:
        """Crea Practice + instanzia practice_phases dal template della categoria.

        Calcola le date pianificate cumulative a partire da `apertura` e
        `template.duration_days`. Scrive activity_log per `created`.
        """
        code = await self._next_code()
        practice_id = uuid4()
        now = datetime.now(UTC)
        practice = Practice(
            id=practice_id,
            code=code,
            title=request.title,
            description=request.description,
            client_id=request.client_id,
            client_token=tokenize(request.client_id),
            category_id=request.category_id,
            responsible_id=request.responsible_id,
            apertura=request.apertura,
            scadenza=request.scadenza,
            priority=request.priority,
            status="aperta",
            created_by=UUID(str(current_user_id)),
            created_at=now,
            completed_at=None,
        )
        await self._practices.create(practice)

        templates = await self._templates_for_category(request.category_id)
        if not templates:
            log.warning("create_practice_no_templates", category_id=str(request.category_id))

        cursor: date = request.apertura
        phase_ids: list[UUID] = []
        for tpl in templates:
            duration = tpl.duration_days if tpl.duration_days and tpl.duration_days > 0 else 1
            phase_end = cursor + timedelta(days=duration)
            phase = PracticePhase(
                id=uuid4(),
                practice_id=practice_id,
                template_id=tpl.id,
                order_index=tpl.order_index,
                name=tpl.name,
                description=tpl.description,
                assignee_id=request.responsible_id,
                planned_start=cursor,
                planned_end=phase_end,
                actual_start=None,
                actual_end=None,
                status="pending",
                skip_reason=None,
                completed_by=None,
                completed_at=None,
            )
            await self._phases.create(phase)
            phase_ids.append(phase.id)
            cursor = phase_end

        await self._activity.log(
            actor_id=current_user_id,
            action="created",
            entity_type="practice",
            entity_id=practice_id,
            practice_id=practice_id,
            metadata={"code": code, "n_phases": len(phase_ids)},
        )
        return CreatePracticeResponse(practice_id=practice_id, code=code, phase_ids=phase_ids)

    async def progress_percentage(self, practice_id: UUID | str) -> int:
        """Percentuale di fasi completate (esclude `skipped` dal denominatore)."""
        phases = await self._phases.list(practice_id=UUID(str(practice_id)))
        countable = [p for p in phases if p.status != "skipped"]
        if not countable:
            return 0
        done = sum(1 for p in countable if p.status == "completed")
        return round(100 * done / len(countable))

    async def archive(
        self,
        practice_id: UUID | str,
        current_user_id: str | UUID,
    ) -> Practice:
        pid = str(practice_id)
        existing = await self._practices.get(pid)
        if existing is None:
            raise NotFoundError("Practice", pid)
        updated = await self._practices.update(pid, status="archiviata")
        await self._activity.log(
            actor_id=current_user_id,
            action="updated",
            entity_type="practice",
            entity_id=updated.id,
            practice_id=updated.id,
            metadata={"action": "archive"},
        )
        return updated

    async def list_phases(self, practice_id: UUID | str) -> Sequence[PracticePhase]:
        phases = await self._phases.list(practice_id=UUID(str(practice_id)))
        return sorted(phases, key=lambda p: p.order_index)
