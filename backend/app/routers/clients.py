"""Router /api/clients — rubrica clienti studio (L1 PROTETTO)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from starlette.responses import JSONResponse

from app.deps import (
    get_activity_log_repo,
    get_client_repo,
    get_current_user_id,
    get_practice_repo,
)
from app.models import (
    ActivityLog,
    Client,
    ClientCreate,
    ClientStatus,
    ClientType,
    ClientUpdate,
    Practice,
)
from app.repositories.base import Repository
from app.routers._helpers import Page, Pagination, get_pagination
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/clients", tags=["clients"])


# ---------------------------------------------------------------------------
# Search per combobox modal Nuova Pratica (enriched con stats)
# ---------------------------------------------------------------------------


class ClientSearchHit(BaseModel):
    """Hit per combobox 'cerca cliente' del modal Nuova Pratica."""

    id: UUID
    code: str
    ragione_sociale: str
    type: ClientType
    piva: str | None = None
    cf: str | None = None
    indirizzo_sede: str | None = None
    cliente_dal_anno: int
    practice_count: int
    """Numero totale di pratiche di questo cliente (qualunque stato)."""
    practice_count_open: int
    """Numero pratiche aperte (status != chiusa/archiviata)."""


@router.get("/search", response_model=list[ClientSearchHit])
async def search_clients(
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    q: Annotated[str | None, Query(min_length=1)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> list[ClientSearchHit]:
    """Ricerca clienti per combobox del modal Nuova Pratica.

    Match case-insensitive su code/ragione_sociale/piva/cf. Restituisce hit
    arricchiti con `practice_count` totale, aperte e `cliente_dal_anno`
    (estratto da `created_at`). Default top 10.
    """
    items = await client_repo.list(status="attivo")
    if q:
        needle = q.casefold()
        items = [
            c
            for c in items
            if needle
            in " ".join(
                filter(None, [c.code, c.ragione_sociale, c.piva or "", c.cf or ""])
            ).casefold()
        ]
    items.sort(key=lambda c: c.ragione_sociale.casefold())

    # Carica una sola volta tutte le pratiche e indicizza per client_id
    all_practices = await practice_repo.list()
    practices_by_client: dict[str, list[Practice]] = {}
    for p in all_practices:
        practices_by_client.setdefault(str(p.client_id), []).append(p)

    hits: list[ClientSearchHit] = []
    for c in items[:limit]:
        client_practices = practices_by_client.get(str(c.id), [])
        open_count = sum(1 for p in client_practices if p.status not in ("chiusa", "archiviata"))
        hits.append(
            ClientSearchHit(
                id=c.id,
                code=c.code,
                ragione_sociale=c.ragione_sociale,
                type=c.type,
                piva=c.piva,
                cf=c.cf,
                indirizzo_sede=c.indirizzo_sede,
                cliente_dal_anno=c.created_at.year,
                practice_count=len(client_practices),
                practice_count_open=open_count,
            )
        )
    return hits


# --- helpers ---


def _matches_search(client: Client, q: str) -> bool:
    needle = q.casefold()
    haystack = " ".join(
        filter(
            None,
            [
                client.code,
                client.ragione_sociale,
                client.piva or "",
                client.cf or "",
                client.email or "",
            ],
        )
    ).casefold()
    return needle in haystack


def _next_code(existing: list[Client]) -> str:
    nums: list[int] = []
    for c in existing:
        if c.code and c.code.startswith("CL-"):
            tail = c.code.split("-", 1)[1]
            if tail.isdigit():
                nums.append(int(tail))
    return f"CL-{(max(nums, default=0) + 1):04d}"


def _validate_piva_cf(piva: str | None, cf: str | None) -> None:
    if piva is not None and (not piva.isdigit() or len(piva) != 11):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="P.IVA non valida: deve essere 11 cifre numeriche",
        )
    if cf is not None and len(cf) not in (11, 16):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Codice Fiscale non valido: deve essere 11 o 16 caratteri",
        )


# --- endpoints ---


@router.get("", response_model=Page[Client])
async def list_clients(
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    pagination: Annotated[Pagination, Depends(get_pagination)],
    q: Annotated[
        str | None, Query(description="Ricerca su code, ragione_sociale, piva, cf, email")
    ] = None,
    type: Annotated[ClientType | None, Query()] = None,
    status_filter: Annotated[ClientStatus | None, Query(alias="status")] = None,
) -> Page[Client]:
    """Lista paginata + ricerca case-insensitive."""
    filters: dict[str, ClientStatus | ClientType] = {}
    if type is not None:
        filters["type"] = type
    if status_filter is not None:
        filters["status"] = status_filter
    items = await client_repo.list(**filters)
    if q:
        items = [c for c in items if _matches_search(c, q)]
    items.sort(key=lambda c: c.ragione_sociale.casefold())
    return Page[Client](
        items=items[pagination.offset : pagination.offset + pagination.limit],
        total=len(items),
        offset=pagination.offset,
        limit=pagination.limit,
    )


@router.get("/{client_id}", response_model=Client)
async def get_client(
    client_id: UUID,
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Client:
    """Scheda cliente. Logga `viewed_l1` perché tabella L1 PROTETTO."""
    client = await client_repo.get(str(client_id))
    if client is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trovato")
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="viewed_l1",
        entity_type="client",
        entity_id=client.id,
    )
    return client


@router.post("", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Client:
    """Crea cliente, auto-assegna `code` CL-NNNN, valida P.IVA e CF."""
    _validate_piva_cf(body.piva, body.cf)
    existing = await client_repo.list()
    code = body.code or _next_code(existing)
    now = datetime.now(UTC)
    new_client = Client(
        id=uuid4(),
        code=code,
        type=body.type,
        ragione_sociale=body.ragione_sociale,
        piva=body.piva,
        cf=body.cf,
        ateco=body.ateco,
        indirizzo_sede=body.indirizzo_sede,
        email=body.email,
        pec=body.pec,
        telefono=body.telefono,
        contatto_referente=body.contatto_referente,
        note=body.note,
        status=body.status,
        created_by=UUID(current_user_id),
        created_at=now,
        updated_at=now,
        deleted_at=None,
    )
    created = await client_repo.create(new_client)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="created",
        entity_type="client",
        entity_id=created.id,
    )
    return created


@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: UUID,
    body: ClientUpdate,
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Client:
    existing = await client_repo.get(str(client_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trovato")

    return await _update_client_fields(
        body=body,
        client_id=client_id,
        client_repo=client_repo,
        activity_repo=activity_repo,
        current_user_id=current_user_id,
    )


@router.patch("/{client_id}", response_model=Client)
async def patch_client(
    client_id: UUID,
    body: ClientUpdate,
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Client:
    existing = await client_repo.get(str(client_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trovato")

    return await _update_client_fields(
        body=body,
        client_id=client_id,
        client_repo=client_repo,
        activity_repo=activity_repo,
        current_user_id=current_user_id,
    )


async def _update_client_fields(
    *,
    body: ClientUpdate,
    client_id: UUID,
    client_repo: Repository[Client],
    activity_repo: Repository[ActivityLog],
    current_user_id: str,
) -> Client:
    _validate_piva_cf(body.piva, body.cf)
    updates = body.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(UTC)
    updated = await client_repo.update(str(client_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="client",
        entity_id=updated.id,
        metadata={"fields": list(body.model_dump(exclude_unset=True).keys())},
    )
    return updated


@router.get("/{client_id}/practices", response_model=list[Practice])
async def list_client_practices(
    client_id: UUID,
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
) -> list[Practice]:
    """Lista pratiche del cliente (per scheda cliente)."""
    return await practice_repo.list(client_id=client_id)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_client(
    client_id: UUID,
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Soft delete cliente. 409 se ha pratiche aperte (status != chiusa/archiviata).

    Setta `status='archiviato'` (status enum V0: attivo|sospeso|archiviato) +
    `deleted_at=now`. Activity log 'deleted'.
    """
    existing = await client_repo.get(str(client_id))
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trovato")

    open_practices = [
        p
        for p in await practice_repo.list(client_id=client_id)
        if p.status not in ("chiusa", "archiviata")
    ]
    if open_practices:
        practices_count = len(open_practices)
        return JSONResponse(
            content={
                "detail": f"Impossibile eliminare: {practices_count} pratiche usano questo cliente",
                "practices_count": practices_count,
            },
            status_code=status.HTTP_409_CONFLICT,
        )

    now = datetime.now(UTC)
    await client_repo.update(str(client_id), status="archiviato", deleted_at=now, updated_at=now)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="client",
        entity_id=existing.id,
        metadata={"soft_delete": True},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
