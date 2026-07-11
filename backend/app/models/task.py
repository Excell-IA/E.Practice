"""Pydantic schemas per i Task assegnabili di una pratica (EPC2-01).

Gap-modulo colmato l'11/07/2026: E.Practice modellava il lavoro come fasi del
template + nodi-evento sull'albero — eleganti per la narrazione della pratica, ma
mancava l'oggetto operativo "attivita che assegno a un collaboratore interno, con
scadenza, priorita, stato e % avanzamento, da vedere in Kanban". Questo modello
introduce quell'oggetto, DISTINTO dalla fase:
  - la fase e' una tappa prevista dal template della pratica;
  - il task e' un'attivita ad-hoc assegnabile, con un ciclo di vita proprio.
Il task puo' agganciarsi opzionalmente a una fase (`phase_id`), ma vive appeso
alla pratica. L'assegnazione e' a un collaboratore INTERNO (l'assegnazione al
cliente esterno resta fuori scope, vedi §4bis del confronto Kowy Caso 2).

Fonte: confronto competitor iPratiche (E.Watch Caso 2, 04/07/2026), gap #2.
"""

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.practice import PracticePriority

# Stati del task = colonne della vista Kanban (PR167). Vocabolario dedicato al
# task, distinto da quello delle fasi (pending/in_progress/completed/...): un task
# ha anche "annullato", una fase no.
TaskStatus = Literal["da_fare", "in_corso", "bloccato", "completato", "annullato"]

# Il titolo di un'attivita operativa e' obbligatorio e non vuoto: stringa con
# whitespace strippato e almeno 1 carattere (rifiuta "" e "   ").
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class PracticeTaskBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None
    title: NonEmptyStr
    description: str | None = None
    assignee_id: UUID | None = None
    priority: PracticePriority = "media"
    status: TaskStatus = "da_fare"
    due_date: date | None = None
    completion_pct: int = Field(default=0, ge=0, le=100)
    completed_at: datetime | None = None


# L2 OPERATIVO — esposto all'AI solo tramite view L3 (mai i campi grezzi).
class PracticeTask(PracticeTaskBase):
    id: UUID
    created_at: datetime


class PracticeTaskCreate(PracticeTaskBase):
    pass


class PracticeTaskUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    phase_id: UUID | None = None
    title: NonEmptyStr | None = None
    description: str | None = None
    assignee_id: UUID | None = None
    priority: PracticePriority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None
    completion_pct: int | None = Field(default=None, ge=0, le=100)
    completed_at: datetime | None = None
