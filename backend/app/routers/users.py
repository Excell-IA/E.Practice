"""Router /api/users — lista utenti studio per dropdown UI."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_user_repo
from app.models import User, UserStatus, UserUpdate
from app.repositories.base import Repository

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
