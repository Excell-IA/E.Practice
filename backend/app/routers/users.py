"""Router /api/users — lista utenti studio per dropdown UI."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.deps import get_user_repo
from app.models import User, UserStatus
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
