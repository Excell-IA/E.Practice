"""Pydantic schemas per la checklist "documenti richiesti/ricevuti" (EPC2-07b).

Gap-modulo colmato l'11/07/2026 (confronto competitor iPratiche, E.Watch Caso 2, gap #1):
E.Practice non aveva un colpo d'occhio su "cosa ho chiesto al cliente e cosa manca
ancora". Questo oggetto traccia ogni documento come voce di checklist con un ciclo di
stato: richiesto -> ricevuto -> controllato. Funziona ANCHE senza portale cliente: la
raccolta puo' avvenire via mail/telefono e il professionista segna lo stato a mano.

Si aggancia alla pratica (obbligatorio) e, opzionalmente, a una fase; quando il
documento arriva puo' referenziare l'allegato ricevuto. Concettualmente ogni voce e'
un nodo sull'albero della pratica (il "documento ricevuto" e' un evento del racconto).
"""

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

# Ciclo di vita della voce di checklist. 'richiesto' = chiesto al cliente, ancora
# mancante; 'ricevuto' = arrivato; 'controllato' = verificato dal professionista.
DocumentRequestStatus = Literal["richiesto", "ricevuto", "controllato"]

# Nome del documento: obbligatorio e non vuoto (strip + min 1 char).
_NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DocumentRequestBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    practice_id: UUID
    phase_id: UUID | None = None
    name: _NonEmptyStr
    description: str | None = None
    status: DocumentRequestStatus = "richiesto"
    attachment_id: UUID | None = None
    due_date: date | None = None
    received_at: date | None = None


# L2 OPERATIVO — esposto all'AI solo tramite view L3.
class DocumentRequest(DocumentRequestBase):
    id: UUID
    created_at: datetime


class DocumentRequestCreate(DocumentRequestBase):
    pass


class DocumentRequestUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    phase_id: UUID | None = None
    name: _NonEmptyStr | None = None
    description: str | None = None
    status: DocumentRequestStatus | None = None
    attachment_id: UUID | None = None
    due_date: date | None = None
    received_at: date | None = None
