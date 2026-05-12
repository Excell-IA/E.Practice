"""FastAPI dependencies condivisi.

Mantengo qui:
- `get_current_user_id` — legge l'identità dall'header `X-User-Id` (V0).
- `get_settings_dep` — wrapper per iniettare `Settings` nei router.

Quando F4 (repository in-memory + seed utenti) sarà pronto, aggiungeremo
`get_current_user` che fa il lookup via repo e ritorna l'oggetto `User`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import Settings, get_settings
from app.constants import USER_HEADER
from app.logging_setup import bind_request_context


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header(alias=USER_HEADER)] = None,
) -> str:
    """Recupera l'ID utente dall'header `X-User-Id` e binda al log context.

    V0: nessuna validazione contro il repository utenti (arriva in F4).
    L'header deve essere presente e non vuoto, altrimenti 401.
    """
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Header {USER_HEADER} mancante o vuoto",
            headers={"WWW-Authenticate": USER_HEADER},
        )
    user_id = x_user_id.strip()
    bind_request_context(user_id=user_id)
    return user_id


CurrentUserId = Annotated[str, "Depends(get_current_user_id)"]
"""Type alias documentativo. Per usarlo davvero in un endpoint:

    from fastapi import Depends
    from app.deps import get_current_user_id

    @router.get("/me")
    async def me(user_id: Annotated[str, Depends(get_current_user_id)]):
        return {"user_id": user_id}
"""


def get_settings_dep() -> Settings:
    """Wrapper per iniettare Settings nei router via FastAPI Depends."""
    return get_settings()
