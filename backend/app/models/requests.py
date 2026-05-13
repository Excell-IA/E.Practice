"""Request and response schemas for E.Practice workflows."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.practice import PracticePriority
from app.models.practice_event import PracticeEventCreate


class PhaseOverride(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    order_index: int
    name: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    enabled: bool = True


class CreatePracticeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    client_id: UUID
    category_id: UUID
    title: str
    description: str | None = None
    responsible_id: UUID | None = None
    apertura: date
    scadenza: date | None = None
    priority: PracticePriority = "media"
    collaborator_ids: list[UUID] = []
    label_ids: list[UUID] = []
    """Etichette da assegnare alla pratica all'atto della creazione (modal step 2)."""
    create_default_reminders: bool = False
    """Se True, crea un Reminder per ogni fase con `days_before=2` rispetto a planned_end.
    Usato dal checkbox 'Crea promemoria automatici per ogni fase' del modal."""
    phase_overrides: list[PhaseOverride] = []
    """Override V0 sulle fasi generate dal template.

    V0 applica solo override su order_index esistenti nel template; fasi custom
    con order_index oltre il template sono lasciate al piano V1.
    """


class CreatePracticeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    code: str
    phase_ids: list[UUID]


class UpdatePhaseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str | None = None
    description: str | None = None
    assignee_id: UUID | None = None
    planned_start: date | None = None
    planned_end: date | None = None


class CompletePhaseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    completed_by: UUID
    actual_end: date | None = None
    note: str | None = None


class SkipPhaseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    completed_by: UUID
    skip_reason: str


class CreateEventRequest(PracticeEventCreate):
    pass


class AddLabelRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    label_id: UUID


class RemoveLabelRequest(AddLabelRequest):
    pass
