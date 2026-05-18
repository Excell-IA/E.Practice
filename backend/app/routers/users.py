"""Router /api/users — lista utenti studio per dropdown UI."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from starlette.responses import JSONResponse

from app.deps import (
    get_activity_log_repo,
    get_current_user_id,
    get_practice_phase_repo,
    get_practice_repo,
    get_user_repo,
)
from app.models import (
    ActivityLog,
    Practice,
    PracticePhase,
    User,
    UserCreate,
    UserStatus,
    UserUpdate,
)
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[User])
async def list_users(
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    status_filter: Annotated[UserStatus | None, Query(alias="status")] = "attivo",
) -> list[User]:
    """V0: lista utenti studio. Filtra di default `status=attivo`.

    Pensato per il dropdown utente del frontend (V0 demo).
    """
    if status_filter is None:
        users = await user_repo.list()
    else:
        users = await user_repo.list(status=status_filter)
    return sorted(users, key=lambda u: (u.cognome, u.nome))


@router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> User:
    """Crea un utente studio. In V0 lo stato viene sempre forzato ad attivo."""
    email = body.email.strip().lower()
    existing = await user_repo.list()
    if any(user.email.casefold() == email.casefold() for user in existing):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email utente gia' esistente"
        )

    user = User(
        id=uuid4(),
        email=email,
        nome=body.nome.strip(),
        cognome=body.cognome.strip(),
        role=body.role,
        status="attivo",
        avatar_color=body.avatar_color,
        created_at=datetime.now(UTC),
        last_access_at=None,
    )
    created = await user_repo.create(user)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="created",
        entity_type="user",
        entity_id=created.id,
    )
    return created


@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
) -> User:
    """V0 demo: modifica inline ruolo/stato utenti studio."""
    existing = await user_repo.get(str(user_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_repo.update(str(user_id), **body.model_dump(exclude_unset=True))


@router.delete("/{user_id}", response_class=Response, status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Elimina un utente solo se non ha assegnazioni operative aperte."""
    existing = await user_repo.get(str(user_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="User not found")

    practices_count = sum(
        1
        for practice in await practice_repo.list(responsible_id=user_id)
        if practice.status not in ("chiusa", "archiviata")
    )
    phases_count = sum(
        1
        for phase in await phase_repo.list(assignee_id=user_id)
        if phase.status not in ("completed", "skipped")
    )
    if practices_count or phases_count:
        return JSONResponse(
            content={
                "detail": (
                    "Impossibile eliminare: utente assegnato a "
                    f"{practices_count} pratiche aperte e {phases_count} fasi attive"
                ),
                "practices_count": practices_count,
                "phases_count": phases_count,
            },
            status_code=status.HTTP_409_CONFLICT,
        )

    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="user",
        entity_id=existing.id,
    )
    await user_repo.delete(str(user_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
