"""Router /api/dashboard — KPI aggregati per la home V0 (enriched per Daisy/Kowy)."""

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
    get_client_repo,
    get_practice_phase_repo,
    get_practice_repo,
    get_user_repo,
)
from app.models import (
    ActivityAction,
    ActivityEntityType,
    ActivityLog,
    Category,
    Client,
    Practice,
    PracticePhase,
    PracticeStatus,
    User,
)
from app.repositories.base import Repository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Helper Summary (avatar/initials/colore — coerenti con PracticeDetail)
# ---------------------------------------------------------------------------


def _initials(user: User) -> str:
    return (f"{user.nome[:1]}{user.cognome[:1]}").upper() or "??"


def _role_label(role: str) -> str:
    """Etichetta human-readable per la badge sotto il nome."""
    return {
        "titolare": "Titolare · Admin",
        "senior": "Senior · Consulente",
        "junior": "Junior · Consulente",
        "esterno": "Esterno · Praticante",
    }.get(role, role)


class UserMiniSummary(BaseModel):
    id: UUID
    nome: str
    cognome: str
    role: str
    role_label: str
    initials: str
    avatar_color: str | None = None


def _user_summary(user: User | None) -> UserMiniSummary | None:
    if user is None:
        return None
    return UserMiniSummary(
        id=user.id,
        nome=user.nome,
        cognome=user.cognome,
        role=user.role,
        role_label=_role_label(user.role),
        initials=_initials(user),
        avatar_color=user.avatar_color,
    )


# ---------------------------------------------------------------------------
# Response schemas (enriched)
# ---------------------------------------------------------------------------


class StatusCount(BaseModel):
    status: PracticeStatus
    count: int


class CategoryDistribution(BaseModel):
    category_id: UUID
    category_name: str
    count: int


class UserWorkload(BaseModel):
    user: UserMiniSummary
    pratiche_aperte: int
    pratiche_in_ritardo: int
    load_pct: int
    """Percentuale di carico relativa al max dello studio (0-100)."""


class TopUrgentPractice(BaseModel):
    practice_id: UUID
    code: str
    title: str
    priority: str
    status: PracticeStatus
    scadenza: date | None
    giorni_al_target: int | None
    client_id: UUID
    client_ragione_sociale: str | None = None
    responsible: UserMiniSummary | None = None


class ActivityEnriched(BaseModel):
    """Activity log row arricchita: actor + entity_label leggibile."""

    timestamp: datetime
    action: ActivityAction
    entity_type: ActivityEntityType
    entity_id: UUID
    practice_id: UUID | None = None
    actor: UserMiniSummary | None = None
    entity_label: str
    """Es. 'Bilancio 2025 · Acciaierie Valgobbia' o 'fase Riconciliazione di Bilancio 2025 · Acciaierie Valgobbia'."""
    phase_name: str | None = None


class DashboardKPI(BaseModel):
    """KPI aggregati per la home dashboard V0."""

    totale_pratiche: int
    counts_per_status: list[StatusCount]
    pratiche_in_ritardo: int
    completate_mese: int
    scadenze_prossime_7gg: int
    top_urgenti: list[TopUrgentPractice]
    distribuzione_categorie: list[CategoryDistribution]
    ultime_attivita: list[ActivityEnriched]
    carico_per_utente: list[UserWorkload]


# ---------------------------------------------------------------------------
# Helpers di label per activity_log enriched
# ---------------------------------------------------------------------------


_ACTION_VERB: dict[ActivityAction, str] = {
    "created": "ha creato",
    "updated": "ha aggiornato",
    "deleted": "ha eliminato",
    "completed": "ha completato",
    "uploaded": "ha caricato",
    "commented": "ha annotato",
    "viewed_l1": "ha aperto",
}


def _practice_label(practice: Practice | None, client_name: str | None) -> str:
    if practice is None:
        return "(pratica rimossa)"
    if client_name:
        return f"{practice.title} · {client_name}"
    return practice.title


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.get("", response_model=DashboardKPI)
async def get_dashboard(
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    category_repo: Annotated[Repository[Category], Depends(get_category_repo)],
    user_repo: Annotated[Repository[User], Depends(get_user_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    client_repo: Annotated[Repository[Client], Depends(get_client_repo)],
) -> DashboardKPI:
    """Aggregato KPI enriched per la home dashboard (1 sola GET = pagina pronta)."""
    today = datetime.now(UTC).date()
    start_of_month = today.replace(day=1)
    in_7gg = today + timedelta(days=7)

    practices = await practice_repo.list()
    open_practices = [p for p in practices if p.status not in ("chiusa", "archiviata")]
    users_index = {str(u.id): u for u in await user_repo.list()}
    categories_index = {str(c.id): c for c in await category_repo.list()}
    clients_index = {str(c.id): c for c in await client_repo.list()}

    # --- Counts per status ---
    status_counter: Counter[str] = Counter(p.status for p in practices)
    counts_per_status = [
        StatusCount(status=s, count=status_counter.get(s, 0))
        for s in ("aperta", "in_attesa", "sospesa", "chiusa", "archiviata")
    ]

    in_ritardo = [p for p in open_practices if p.scadenza and p.scadenza < today]
    completate_mese = [
        p
        for p in practices
        if p.status == "chiusa" and p.completed_at and p.completed_at.date() >= start_of_month
    ]
    scadenze_7gg = [p for p in open_practices if p.scadenza and today <= p.scadenza <= in_7gg]

    # --- Top urgenti (priority alta + ritardo) ---
    # Comprende: tutte le pratiche in_ritardo + pratiche aperte a priorità alta,
    # dedup, sort per scadenza asc, top 5.
    urgent_pool: dict[UUID, Practice] = {}
    for p in in_ritardo:
        urgent_pool[p.id] = p
    for p in open_practices:
        if p.priority == "alta" and p.id not in urgent_pool:
            urgent_pool[p.id] = p
    urgent_sorted = sorted(urgent_pool.values(), key=lambda p: (p.scadenza or date.max))[:5]

    top_urgenti = [
        TopUrgentPractice(
            practice_id=p.id,
            code=p.code,
            title=p.title,
            priority=p.priority,
            status=p.status,
            scadenza=p.scadenza,
            giorni_al_target=((p.scadenza - today).days if p.scadenza else None),
            client_id=p.client_id,
            client_ragione_sociale=(
                clients_index[str(p.client_id)].ragione_sociale
                if str(p.client_id) in clients_index
                else None
            ),
            responsible=_user_summary(
                users_index.get(str(p.responsible_id)) if p.responsible_id else None
            ),
        )
        for p in urgent_sorted
    ]

    # --- Distribuzione per categoria ---
    cat_counter: Counter[str] = Counter(str(p.category_id) for p in practices)
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

    # --- Ultime 10 attività enriched ---
    practices_index = {p.id: p for p in practices}
    phases_index = {ph.id: ph for ph in await phase_repo.list()}

    raw_activity = sorted(
        await activity_repo.list(),
        key=lambda a: a.timestamp,
        reverse=True,
    )[:10]

    ultime_attivita: list[ActivityEnriched] = []
    for a in raw_activity:
        actor = users_index.get(str(a.actor_id))
        actor_summary = _user_summary(actor)

        related_practice = practices_index.get(a.practice_id) if a.practice_id else None
        # Per entity_label friendly costruiamo a seconda di entity_type
        phase_name: str | None = None
        if a.entity_type == "practice":
            entity_label = _practice_label(related_practice, None)
        elif a.entity_type == "phase":
            phase = phases_index.get(a.entity_id)
            phase_name = phase.name if phase else None
            if phase and related_practice:
                entity_label = f"fase {phase.name} di {related_practice.title}"
            elif related_practice:
                entity_label = f"fase di {related_practice.title}"
            else:
                entity_label = "fase"
        elif a.entity_type == "event":
            entity_label = f"evento su {related_practice.title}" if related_practice else "evento"
        elif a.entity_type == "note":
            entity_label = f"nota su {related_practice.title}" if related_practice else "nota"
        elif a.entity_type == "attachment":
            entity_label = (
                f"allegato su {related_practice.title}" if related_practice else "allegato"
            )
        elif a.entity_type == "client":
            entity_label = "scheda cliente"
        else:
            entity_label = str(a.entity_type)

        ultime_attivita.append(
            ActivityEnriched(
                timestamp=a.timestamp,
                action=a.action,
                entity_type=a.entity_type,
                entity_id=a.entity_id,
                practice_id=a.practice_id,
                actor=actor_summary,
                entity_label=entity_label,
                phase_name=phase_name,
            )
        )

    # --- Carico per utente ---
    workload_open: Counter[str] = Counter(
        str(p.responsible_id) for p in open_practices if p.responsible_id
    )
    workload_late: Counter[str] = Counter(
        str(p.responsible_id) for p in in_ritardo if p.responsible_id
    )
    max_aperte = max(workload_open.values(), default=0) or 1
    carico_per_utente_raw = [
        UserWorkload(
            user=_user_summary(users_index[uid]),
            pratiche_aperte=workload_open.get(uid, 0),
            pratiche_in_ritardo=workload_late.get(uid, 0),
            load_pct=round(100 * workload_open.get(uid, 0) / max_aperte),
        )
        for uid in workload_open
        if uid in users_index
    ]
    carico_per_utente = sorted(carico_per_utente_raw, key=lambda w: w.pratiche_aperte, reverse=True)

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
