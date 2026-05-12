"""Router /api/search — ricerca globale multi-entità."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.deps import (
    get_client_repo,
    get_practice_event_repo,
    get_practice_repo,
)
from app.models import Client, Practice, PracticeEvent
from app.repositories.base import Repository

router = APIRouter(prefix="/search", tags=["search"])


SearchEntityType = Literal["client", "practice", "event"]


class SearchHit(BaseModel):
    type: SearchEntityType
    id: UUID
    label: str
    url: str
    sublabel: str | None = None


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]
    total: int


@router.get("", response_model=SearchResponse)
async def global_search(
    q: Annotated[str, Query(min_length=2, description="Stringa di ricerca (min 2 char)")],
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    event_repo: Annotated[Repository[PracticeEvent], Depends(get_practice_event_repo)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> SearchResponse:
    """Ricerca multi-entità: clients (ragione_sociale, piva, code),
    practices (title, code), events (title). Top `limit` risultati totali."""
    needle = q.casefold()

    hits: list[SearchHit] = []

    # Clients
    for c in await client_repo.list():
        haystack = " ".join(
            filter(None, [c.code, c.ragione_sociale, c.piva or "", c.cf or ""])
        ).casefold()
        if needle in haystack:
            hits.append(
                SearchHit(
                    type="client",
                    id=c.id,
                    label=f"{c.code} · {c.ragione_sociale}",
                    sublabel=c.piva,
                    url=f"/clienti/{c.id}",
                )
            )

    # Practices
    for p in await practice_repo.list():
        haystack = " ".join(filter(None, [p.code, p.title])).casefold()
        if needle in haystack:
            hits.append(
                SearchHit(
                    type="practice",
                    id=p.id,
                    label=f"{p.code} · {p.title}",
                    sublabel=p.status,
                    url=f"/pratiche/{p.id}",
                )
            )

    # Events
    for e in await event_repo.list():
        haystack = " ".join(filter(None, [e.title, e.description or ""])).casefold()
        if needle in haystack:
            hits.append(
                SearchHit(
                    type="event",
                    id=e.id,
                    label=e.title,
                    sublabel=str(e.event_date),
                    url=f"/pratiche/{e.practice_id}",
                )
            )

    total = len(hits)
    return SearchResponse(query=q, hits=hits[:limit], total=total)
