"""Request and response schemas for E.Practice workflows."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.practice import Practice, PracticePriority, PracticeTargetType
from app.models.practice_event import PracticeEventCreate


class PhaseOverride(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    order_index: int
    name: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    assignee_id: UUID | None = None
    enabled: bool = True


class CreatePracticeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    client_id: UUID | None = None
    target_type: PracticeTargetType | None = None
    target_id: UUID | None = None
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

    @model_validator(mode="after")
    def validate_subject_reference(self) -> "CreatePracticeRequest":
        has_target_type = self.target_type is not None
        has_target_id = self.target_id is not None
        if has_target_type != has_target_id:
            raise ValueError("target_type e target_id devono essere valorizzati insieme")
        if self.client_id is None and self.target_id is None:
            raise ValueError("Specificare client_id oppure target_type e target_id")
        return self


class CreatePracticeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    code: str
    phase_ids: list[UUID]


class EnsurePracticeRequest(BaseModel):
    """Crea la pratica relazionale solo quando il primo evento la richiede."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    target_type: PracticeTargetType
    target_id: UUID
    category_id: UUID
    title: str
    description: str | None = None
    responsible_id: UUID | None = None
    apertura: date
    scadenza: date | None = None
    priority: PracticePriority = "media"
    create_default_reminders: bool = False


class EnsurePracticeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice: Practice
    created: bool


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


class UpdateNoteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    body: str | None = None
    content: str | None = None
    occurred_at: date | None = None


class AttachRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None


class AddLabelRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    label_id: UUID


class RemoveLabelRequest(AddLabelRequest):
    pass
