from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest

from app.models import (
    ActivityLog,
    CreatePracticeRequest,
    PhaseOverride,
    PhaseTemplate,
    Practice,
    PracticePhase,
)
from app.repositories.memory import InMemoryRepository
from app.services.activity_service import ActivityService
from app.services.practice_service import PracticeService
from app.services.tokenize import tokenize


@pytest.mark.asyncio
async def test_create_with_template_applies_phase_override_planned_end() -> None:
    category_id = UUID("22222222-2222-4222-8222-000000000003")
    client_id = UUID("55555555-5555-4555-8555-000000000001")
    user_id = UUID("11111111-1111-4111-8111-000000000001")
    template_repo = InMemoryRepository[PhaseTemplate](
        "PhaseTemplate",
        seed=[
            PhaseTemplate(
                id=UUID("33333333-3333-4333-8333-000000000001"),
                category_id=category_id,
                order_index=1,
                name="Raccolta",
                duration_days=2,
            ),
            PhaseTemplate(
                id=UUID("33333333-3333-4333-8333-000000000002"),
                category_id=category_id,
                order_index=2,
                name="Bozza",
                duration_days=3,
            ),
        ],
    )
    phase_repo = InMemoryRepository[PracticePhase]("PracticePhase")
    service = PracticeService(
        InMemoryRepository[Practice]("Practice"),
        template_repo,
        phase_repo,
        ActivityService(InMemoryRepository[ActivityLog]("ActivityLog")),
    )

    response = await service.create_with_template(
        CreatePracticeRequest(
            client_id=client_id,
            category_id=category_id,
            title="Bilancio test",
            responsible_id=user_id,
            apertura=date(2026, 7, 1),
            phase_overrides=[
                PhaseOverride(order_index=2, planned_end=date(2026, 8, 1)),
            ],
        ),
        user_id,
    )

    phases = await phase_repo.list(practice_id=response.practice_id)
    phase_2 = next(phase for phase in phases if phase.order_index == 2)
    assert phase_2.planned_end == date(2026, 8, 1)


@pytest.mark.asyncio
async def test_create_with_template_disables_phase_override() -> None:
    category_id = UUID("22222222-2222-4222-8222-000000000003")
    client_id = UUID("55555555-5555-4555-8555-000000000001")
    user_id = UUID("11111111-1111-4111-8111-000000000001")
    template_repo = InMemoryRepository[PhaseTemplate](
        "PhaseTemplate",
        seed=[
            PhaseTemplate(
                id=UUID("33333333-3333-4333-8333-000000000001"),
                category_id=category_id,
                order_index=1,
                name="Raccolta",
                duration_days=2,
            ),
            PhaseTemplate(
                id=UUID("33333333-3333-4333-8333-000000000002"),
                category_id=category_id,
                order_index=2,
                name="Bozza",
                duration_days=3,
            ),
        ],
    )
    phase_repo = InMemoryRepository[PracticePhase]("PracticePhase")
    service = PracticeService(
        InMemoryRepository[Practice]("Practice"),
        template_repo,
        phase_repo,
        ActivityService(InMemoryRepository[ActivityLog]("ActivityLog")),
    )

    response = await service.create_with_template(
        CreatePracticeRequest(
            client_id=client_id,
            category_id=category_id,
            title="Bilancio test",
            responsible_id=user_id,
            apertura=date(2026, 7, 1),
            phase_overrides=[PhaseOverride(order_index=1, enabled=False)],
        ),
        user_id,
    )

    phases = await phase_repo.list(practice_id=response.practice_id)
    assert [phase.order_index for phase in phases] == [2]


def _make_phase(
    practice_id: UUID,
    *,
    order_index: int,
    status: str,
) -> PracticePhase:
    return PracticePhase(
        id=uuid4(),
        practice_id=practice_id,
        template_id=None,
        order_index=order_index,
        name=f"Fase {order_index}",
        status=status,  # type: ignore[arg-type]
    )


def _make_practice(*, status: str = "aperta") -> Practice:
    client_id = UUID("55555555-5555-4555-8555-000000000001")
    return Practice(
        id=uuid4(),
        code="PR-2026-T01",
        title="Test recompute",
        client_id=client_id,
        client_token=tokenize(client_id),
        category_id=UUID("22222222-2222-4222-8222-000000000003"),
        apertura=date(2026, 1, 1),
        status=status,  # type: ignore[arg-type]
        created_by=UUID("11111111-1111-4111-8111-000000000001"),
        created_at=datetime.now(UTC),
    )


async def _build_service(
    practice: Practice,
    phases: list[PracticePhase],
) -> tuple[PracticeService, InMemoryRepository[Practice], InMemoryRepository[PracticePhase]]:
    practice_repo = InMemoryRepository[Practice]("Practice", seed=[practice])
    phase_repo = InMemoryRepository[PracticePhase]("PracticePhase", seed=phases)
    template_repo = InMemoryRepository[PhaseTemplate]("PhaseTemplate")
    activity = ActivityService(InMemoryRepository[ActivityLog]("ActivityLog"))
    return (
        PracticeService(practice_repo, template_repo, phase_repo, activity),
        practice_repo,
        phase_repo,
    )


@pytest.mark.asyncio
async def test_recompute_status_blocked_phase_marks_sospesa() -> None:
    practice = _make_practice(status="aperta")
    phases = [
        _make_phase(practice.id, order_index=1, status="completed"),
        _make_phase(practice.id, order_index=2, status="blocked"),
        _make_phase(practice.id, order_index=3, status="pending"),
    ]
    service, practice_repo, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "sospesa"
    assert (await practice_repo.get(str(practice.id))).status == "sospesa"


@pytest.mark.asyncio
async def test_recompute_status_all_completed_or_skipped_marks_chiusa() -> None:
    practice = _make_practice(status="aperta")
    phases = [
        _make_phase(practice.id, order_index=1, status="completed"),
        _make_phase(practice.id, order_index=2, status="skipped"),
        _make_phase(practice.id, order_index=3, status="completed"),
    ]
    service, _, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "chiusa"
    assert updated.completed_at is not None


@pytest.mark.asyncio
async def test_recompute_status_in_progress_phase_stays_aperta() -> None:
    """V0 (4 stati): una pratica con fasi in_progress resta 'aperta'.

    Il livello di avanzamento si vede dal progress %, niente bisogno di uno
    stato intermedio 'in_corso'.
    """
    practice = _make_practice(status="aperta")
    phases = [
        _make_phase(practice.id, order_index=1, status="in_progress"),
        _make_phase(practice.id, order_index=2, status="pending"),
    ]
    service, _, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "aperta"


@pytest.mark.asyncio
async def test_recompute_status_all_pending_marks_aperta() -> None:
    practice = _make_practice(status="aperta")
    phases = [
        _make_phase(practice.id, order_index=1, status="pending"),
        _make_phase(practice.id, order_index=2, status="pending"),
    ]
    service, _, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "aperta"


@pytest.mark.asyncio
async def test_recompute_status_chiusa_back_to_aperta_clears_completed_at() -> None:
    practice = _make_practice(status="chiusa")
    practice = practice.model_copy(update={"completed_at": datetime.now(UTC)})
    phases = [
        _make_phase(practice.id, order_index=1, status="completed"),
        _make_phase(practice.id, order_index=2, status="pending"),
    ]
    service, _, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "aperta"
    assert updated.completed_at is None


@pytest.mark.asyncio
async def test_recompute_status_preserves_manual_in_attesa() -> None:
    """Lo stato manuale 'in_attesa' viene preservato dal recompute (a meno
    che non scattino le condizioni sospesa o chiusa)."""
    practice = _make_practice(status="in_attesa")
    phases = [
        _make_phase(practice.id, order_index=1, status="pending"),
        _make_phase(practice.id, order_index=2, status="pending"),
    ]
    service, _, _ = await _build_service(practice, phases)
    updated = await service.recompute_status(practice.id, practice.created_by)
    assert updated is not None
    assert updated.status == "in_attesa"
