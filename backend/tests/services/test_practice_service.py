from datetime import date
from uuid import UUID

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
