"""Router /api/dashboard — KPI aggregati per la home V0."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, date, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps import (
    get_activity_log_repo,
    get_category_repo,
    get_practice_repo,
    get_user_repo,
)
from app.models import (
    ActivityLog,
    Category,
    Practice,
    PracticeStatus,
    User,
)
from app.repositories.base import Repository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# --- Response schemas ---


class StatusCount(BaseModel):
    status: PracticeStatus
    count: int


class CategoryDistribution(BaseModel):
    category_id: UUID
    category_name: str
    count: int


class UserWorkload(BaseModel):
    user_id: UUID
    user_name: str
    pratiche_aperte: int
    pratiche_in_ritardo: int


class TopUrgentPractice(BaseModel):
    practice_id: UUID
    code: str
    title: str
    priority: str
    scadenza: date | None
    giorni_al_target: int | None


class ActivitySummary(BaseModel):
    actor_id: UUID
    action: str
    entity_type: str
    entity_id: UUID
    timestamp: datetime


class DashboardKPI(BaseModel):
    """KPI per la home dashboard V0."""

    totale_pratiche: int
    counts_per_status: list[StatusCount]
    pratiche_in_ritardo: int
    completate_mese: int
    scadenze_prossime_7gg: int
    top_urgenti: list[TopUrgentPractice]
    distribuzione_categorie: list[CategoryDistribution]
    ultime_attivita: list[ActivitySummary]
    carico_per_utente: list[UserWorkload]


# --- Endpoint ---


@router.get("", response_model=DashboardKPI)
async def get_dashboard(
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    category_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
) -> DashboardKPI:
    """Aggregato KPI per la home dashboard del frontend (1 sola GET)."""
    today = datetime.now(UTC).date()
    start_of_month = today.replace(day=1)
    in_7gg = today + timedelta(days=7)

    practices = await practice_repo.list()
    open_practices = [p for p in practices if p.status not in ("chiusa", "archiviata")]

    # Counts per status
    status_counter: Counter[str] = Counter(p.status for p in practices)
    counts_per_status = [
        StatusCount(status=s, count=status_counter.get(s, 0))
        for s in ("aperta", "in_corso", "in_attesa", "sospesa", "chiusa", "archiviata")
    ]

    # In ritardo
    in_ritardo = [p for p in open_practices if p.scadenza and p.scadenza < today]

    # Completate questo mese
    completate_mese = [
        p
        for p in practices
        if p.status == "chiusa" and p.completed_at and p.completed_at.date() >= start_of_month
    ]

    # Scadenze prossime 7gg
    scadenze_7gg = [p for p in open_practices if p.scadenza and today <= p.scadenza <= in_7gg]

    # Top 5 urgenti (alta priorità, non chiusa, sort scadenza asc)
    urgenti = sorted(
        [p for p in open_practices if p.priority == "alta"],
        key=lambda p: (p.scadenza or date.max),
    )[:5]
    top_urgenti = [
        TopUrgentPractice(
            practice_id=p.id,
            code=p.code,
            title=p.title,
            priority=p.priority,
            scadenza=p.scadenza,
            giorni_al_target=((p.scadenza - today).days if p.scadenza else None),
        )
        for p in urgenti
    ]

    # Distribuzione per categoria
    cat_counter: Counter[str] = Counter(str(p.category_id) for p in practices)
    categories_index = {str(c.id): c for c in await category_repo.list()}
    distribuzione_categorie = sorted(
        [
            CategoryDistribution(
                category_id=UUID(cid),
                category_name=categories_index[cid].name if cid in categories_index else "?",
                count=count,
            )
            for cid, count in cat_counter.items()
            if cid in categories_index
        ],
        key=lambda d: d.count,
        reverse=True,
    )

    # Ultime 10 attività
    activity_log = sorted(
        await activity_repo.list(),
        key=lambda a: a.timestamp,
        reverse=True,
    )[:10]
    ultime_attivita = [
        ActivitySummary(
            actor_id=a.actor_id,
            action=a.action,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            timestamp=a.timestamp,
        )
        for a in activity_log
    ]

    # Carico per utente: pratiche aperte per responsible_id
    users_index = {str(u.id): u for u in await user_repo.list()}
    workload_open: Counter[str] = Counter(
        str(p.responsible_id) for p in open_practices if p.responsible_id
    )
    workload_late: Counter[str] = Counter(
        str(p.responsible_id) for p in in_ritardo if p.responsible_id
    )
    carico_per_utente = sorted(
        [
            UserWorkload(
                user_id=UUID(uid),
                user_name=f"{users_index[uid].nome} {users_index[uid].cognome}"
                if uid in users_index
                else "?",
                pratiche_aperte=workload_open.get(uid, 0),
                pratiche_in_ritardo=workload_late.get(uid, 0),
            )
            for uid in workload_open
            if uid in users_index
        ],
        key=lambda w: w.pratiche_aperte,
        reverse=True,
    )

    return DashboardKPI(
        totale_pratiche=len(practices),
        counts_per_status=counts_per_status,
        pratiche_in_ritardo=len(in_ritardo),
        completate_mese=len(completate_mese),
        scadenze_prossime_7gg=len(scadenze_7gg),
        top_urgenti=top_urgenti,
        distribuzione_categorie=distribuzione_categorie,
        ultime_attivita=ultime_attivita,
        carico_per_utente=carico_per_utente,
    )
