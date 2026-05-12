"""Router /api/session — login fittizio V0 con dropdown utente."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.deps import get_user_repo
from app.logging_setup import bind_request_context, get_logger
from app.models import User
from app.repositories.base import Repository

router = APIRouter(prefix="/session", tags=["session"])
log = get_logger(__name__)


class SessionRequest(BaseModel):
    user_id: UUID


class SessionResponse(BaseModel):
    user: User


@router.post("", response_model=SessionResponse, status_code=status.HTTP_200_OK)
async def create_session(
    body: SessionRequest,
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
) -> SessionResponse:
    """V0 login fake. Verifica che l'utente esista e ritorna i suoi dati.

    Il frontend salva poi `user_id` in `localStorage` e lo invia come header
    `X-User-Id` su tutte le successive richieste.
    """
    user = await user_repo.get(str(body.user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User non trovato: {body.user_id}",
        )
    if user.status != "attivo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {user.email} non attivo (status={user.status})",
        )
    bind_request_context(user_id=str(user.id))
    log.info("session_created", user_id=str(user.id), email=user.email, role=user.role)
    return SessionResponse(user=user)
