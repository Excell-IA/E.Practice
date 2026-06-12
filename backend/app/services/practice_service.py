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
    EnsurePracticeRequest,
    EnsurePracticeResponse,
    PhaseOverride,
    PhaseTemplate,
    Practice,
    PracticePhase,
    Reminder,
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
        reminder_repo: Repository[Reminder] | None = None,
    ) -> None:
        self._practices = practice_repo
        self._templates = template_repo
        self._phases = phase_repo
        self._activity = activity
        self._reminders = reminder_repo

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

    def _override_for_template(
        self,
        tpl: PhaseTemplate,
        overrides: dict[int, PhaseOverride],
    ) -> PhaseOverride | None:
        return overrides.get(tpl.order_index)

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
        subject_id = request.target_id or request.client_id
        if subject_id is None:
            raise ValueError("La pratica richiede un soggetto E.Contacts o un client V0")
        practice = Practice(
            id=practice_id,
            code=code,
            title=request.title,
            description=request.description,
            client_id=request.client_id,
            client_token=tokenize(subject_id),
            target_type=request.target_type,
            target_id=request.target_id,
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

        overrides = {override.order_index: override for override in request.phase_overrides}
        max_template_order = max((tpl.order_index for tpl in templates), default=0)
        # V0: fasi custom FE con order_index oltre il template sono ignorate.
        custom_override_count = sum(1 for order in overrides if order > max_template_order)
        if custom_override_count:
            log.info(
                "create_practice_custom_phase_overrides_ignored_v0",
                count=custom_override_count,
                category_id=str(request.category_id),
            )

        cursor: date = request.apertura
        phase_ids: list[UUID] = []
        created_phases: list[PracticePhase] = []
        for tpl in templates:
            override = self._override_for_template(tpl, overrides)
            if override is not None and not override.enabled:
                duration = tpl.duration_days if tpl.duration_days and tpl.duration_days > 0 else 1
                cursor += timedelta(days=duration)
                continue
            duration = tpl.duration_days if tpl.duration_days and tpl.duration_days > 0 else 1
            planned_start = (
                override.planned_start if override and override.planned_start else cursor
            )
            phase_end = cursor + timedelta(days=duration)
            planned_end = override.planned_end if override and override.planned_end else phase_end
            phase = PracticePhase(
                id=uuid4(),
                practice_id=practice_id,
                template_id=tpl.id,
                order_index=tpl.order_index,
                name=override.name if override and override.name else tpl.name,
                description=tpl.description,
                assignee_id=override.assignee_id
                if override and override.assignee_id
                else request.responsible_id,
                planned_start=planned_start,
                planned_end=planned_end,
                actual_start=None,
                actual_end=None,
                status="pending",
                skip_reason=None,
                completed_by=None,
                completed_at=None,
            )
            await self._phases.create(phase)
            phase_ids.append(phase.id)
            created_phases.append(phase)
            cursor = phase_end

        # Default reminders (1 per fase, days_before=2) se richiesto
        reminder_count = 0
        if request.create_default_reminders and self._reminders is not None:
            recipient = request.responsible_id or UUID(str(current_user_id))
            templates_by_order = {tpl.order_index: tpl for tpl in templates}
            for phase in created_phases:
                tpl = templates_by_order[phase.order_index]
                reminder = Reminder(
                    id=uuid4(),
                    practice_id=practice_id,
                    phase_id=phase.id,
                    title=f"Promemoria {tpl.name}",
                    target_date=phase.planned_end or request.apertura,
                    days_before=2,
                    recipient_id=recipient,
                    status="pending",
                    created_at=now,
                )
                await self._reminders.create(reminder)
                reminder_count += 1

        await self._activity.log(
            actor_id=current_user_id,
            action="created",
            entity_type="practice",
            entity_id=practice_id,
            practice_id=practice_id,
            metadata={
                "code": code,
                "n_phases": len(phase_ids),
                "n_reminders": reminder_count,
                "target_type": request.target_type,
                "target_id": str(request.target_id) if request.target_id else None,
            },
        )
        return CreatePracticeResponse(practice_id=practice_id, code=code, phase_ids=phase_ids)

    async def ensure_for_target(
        self,
        request: EnsurePracticeRequest,
        current_user_id: str | UUID,
    ) -> EnsurePracticeResponse:
        """Restituisce la pratica attiva del target o la crea in modo idempotente."""

        matches = await self._practices.list(
            target_type=request.target_type,
            target_id=request.target_id,
        )
        active = [practice for practice in matches if practice.status != "archiviata"]
        if active:
            active.sort(key=lambda practice: practice.created_at, reverse=True)
            return EnsurePracticeResponse(practice=active[0], created=False)

        created = await self.create_with_template(
            CreatePracticeRequest(
                target_type=request.target_type,
                target_id=request.target_id,
                category_id=request.category_id,
                title=request.title,
                description=request.description,
                responsible_id=request.responsible_id,
                apertura=request.apertura,
                scadenza=request.scadenza,
                priority=request.priority,
                create_default_reminders=request.create_default_reminders,
            ),
            current_user_id,
        )
        practice = await self._practices.get(str(created.practice_id))
        if practice is None:
            raise RuntimeError("Practice creata ma non rileggibile dal repository")
        return EnsurePracticeResponse(practice=practice, created=True)

    async def progress_stats(self, practice_id: UUID | str) -> tuple[int, int, int]:
        """Ritorna ``(closed, total, pct)`` calcolato dalle fasi della pratica.

        ``closed`` = fasi con status ``completed`` o ``skipped``.
        ``total`` = numero totale di fasi.
        ``pct`` = round(100 * closed / total), 0 se nessuna fase.

        Formula unica usata sia dal detail aggregato sia dalla list.
        """
        phases = await self._phases.list(practice_id=UUID(str(practice_id)))
        total = len(phases)
        if total == 0:
            return 0, 0, 0
        closed = sum(1 for p in phases if p.status in ("completed", "skipped"))
        return closed, total, round(100 * closed / total)

    async def progress_percentage(self, practice_id: UUID | str) -> int:
        """Percentuale di fasi chiuse (completed o skipped) sul totale."""
        _, _, pct = await self.progress_stats(practice_id)
        return pct

    async def recompute_status(
        self,
        practice_id: UUID | str,
        current_user_id: str | UUID,
    ) -> Practice | None:
        """Aggiorna lo stato della pratica derivandolo dallo stato delle fasi.

        Regole (V0, 4 stati derivati):
        - almeno una fase ``blocked`` → ``sospesa``
        - tutte le fasi sono ``completed`` o ``skipped`` (e ce n'è almeno una) → ``chiusa``
        - altrimenti → ``aperta`` (anche se ha fasi in_progress: il livello di
          avanzamento si vede dal progress %, niente bisogno di uno stato
          intermedio "in_corso").

        Nota: ``in_attesa`` non è derivato — è uno stato manuale (blocco
        esterno: cliente non risponde, doc mancante). Va impostato dall'utente
        e ``recompute_status`` non lo sovrascrive a meno che le condizioni
        sospesa/chiusa scattino esplicitamente.
        """
        pid = str(practice_id)
        practice = await self._practices.get(pid)
        if practice is None:
            return None
        phases = await self._phases.list(practice_id=UUID(pid))

        if any(p.status == "blocked" for p in phases):
            target = "sospesa"
        elif phases and all(p.status in ("completed", "skipped") for p in phases):
            target = "chiusa"
        elif practice.status == "in_attesa":
            # rispetta lo stato manuale finché non scattano sospesa/chiusa
            target = "in_attesa"
        else:
            target = "aperta"

        if practice.status == target and (target != "chiusa" or practice.completed_at):
            return practice

        updates: dict[str, object] = {"status": target}
        if target == "chiusa" and practice.completed_at is None:
            updates["completed_at"] = datetime.now(UTC)
        if target != "chiusa" and practice.completed_at is not None:
            updates["completed_at"] = None
        updated = await self._practices.update(pid, **updates)
        await self._activity.log(
            actor_id=current_user_id,
            action="updated",
            entity_type="practice",
            entity_id=updated.id,
            practice_id=updated.id,
            metadata={"action": "recompute_status", "status": target},
        )
        return updated

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
