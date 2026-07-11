"""Router /api/document-requests — checklist documenti richiesti/ricevuti (EPC2-07b).

Traccia i documenti chiesti al cliente e il loro stato (richiesto -> ricevuto ->
controllato), senza portale: il professionista segna a mano. Si aggancia alla pratica
e, opzionalmente, a una fase; quando il documento arriva puo' referenziare l'allegato.

Stessa disciplina di integrita' del router tasks (review Codex 11/07):
  - la fase, se indicata, deve appartenere alla stessa pratica;
  - l'allegato, se indicato, deve esistere e non appartenere a un'altra pratica;
  - il nome e' obbligatorio e non vuoto (a livello di modello);
  - passando a 'ricevuto'/'controllato' si valorizza la data di ricezione se assente;
  - ogni mutazione scrive nell'Activity Log (entity_type 'document_request').
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.deps import (
    get_activity_log_repo,
    get_attachment_repo,
    get_current_user_id,
    get_document_request_repo,
    get_practice_phase_repo,
    get_practice_repo,
)
from app.models import (
    ActivityLog,
    Attachment,
    DocumentRequest,
    DocumentRequestCreate,
    DocumentRequestStatus,
    DocumentRequestUpdate,
    Practice,
    PracticePhase,
)
from app.repositories.base import Repository
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/document-requests", tags=["document-requests"])


async def _validate_refs(
    phase_repo: Repository[PracticePhase],
    attachment_repo: Repository[Attachment],
    *,
    practice_id: UUID,
    phase_id: UUID | None,
    attachment_id: UUID | None,
) -> None:
    """Verifica che fase e allegato, se indicati, siano coerenti con la pratica."""
    if phase_id is not None:
        phase = await phase_repo.get(str(phase_id))
        if phase is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fase non trovata")
        if phase.practice_id != practice_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La fase indicata non appartiene alla pratica del documento",
            )
    if attachment_id is not None:
        attachment = await attachment_repo.get(str(attachment_id))
        if attachment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Allegato non trovato"
            )
        # Un allegato gia' agganciato a un'altra pratica non puo' essere il file di questa.
        if attachment.practice_id is not None and attachment.practice_id != practice_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="L'allegato appartiene a un'altra pratica",
            )


_RECEIVED_STATES = ("ricevuto", "controllato")


def _set_received_coherence(
    data: dict[str, Any], *, status_value: str, current_received: object
) -> None:
    """Coerenza di received_at rispetto allo stato (muta `data` in place).

    - 'richiesto'            -> received_at azzerata (un documento non ancora ricevuto
      non puo' avere una data di ricezione, nemmeno tornando indietro dallo stato ricevuto);
    - 'ricevuto'/'controllato' -> received_at valorizzata a oggi se assente.
    """
    if status_value == "richiesto":
        data["received_at"] = None
    elif status_value in _RECEIVED_STATES and data.get("received_at", current_received) is None:
        data["received_at"] = datetime.now(UTC).date()


def _check_transition(current_status: str, new_status: str) -> None:
    """Impone il ciclo richiesto -> ricevuto -> controllato: vietato saltare 'ricevuto'."""
    if current_status == "richiesto" and new_status == "controllato":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transizione non valida: da 'richiesto' si passa prima a 'ricevuto'",
        )


@router.get("", response_model=list[DocumentRequest])
async def list_document_requests(
    repo: Annotated[Repository[DocumentRequest], Depends(get_document_request_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
    practice_id: Annotated[UUID | None, Query()] = None,
    status_filter: Annotated[DocumentRequestStatus | None, Query(alias="status")] = None,
) -> list[DocumentRequest]:
    """Lista voci di checklist, filtrabile per pratica e stato."""
    filters: dict[str, object] = {}
    if practice_id is not None:
        filters["practice_id"] = practice_id
    if status_filter is not None:
        filters["status"] = status_filter
    return await repo.list(**filters)


@router.get("/{doc_id}", response_model=DocumentRequest)
async def get_document_request(
    doc_id: UUID,
    repo: Annotated[Repository[DocumentRequest], Depends(get_document_request_repo)],
    _current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> DocumentRequest:
    """Dettaglio di una singola voce di checklist."""
    item = await repo.get(str(doc_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")
    return item


@router.post("", response_model=DocumentRequest, status_code=status.HTTP_201_CREATED)
async def create_document_request(
    body: DocumentRequestCreate,
    repo: Annotated[Repository[DocumentRequest], Depends(get_document_request_repo)],
    practice_repo: Annotated[Repository[Practice], Depends(get_practice_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    attachment_repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> DocumentRequest:
    """Aggiunge un documento richiesto alla checklist di una pratica."""
    practice = await practice_repo.get(str(body.practice_id))
    if practice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pratica non trovata")
    # Un documento entra in checklist come 'richiesto' (o direttamente 'ricevuto' se gia'
    # in mano): non puo' nascere 'controllato', che presuppone una verifica successiva.
    if body.status == "controllato":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un documento non puo' nascere 'controllato': prima va ricevuto e verificato",
        )
    await _validate_refs(
        phase_repo,
        attachment_repo,
        practice_id=body.practice_id,
        phase_id=body.phase_id,
        attachment_id=body.attachment_id,
    )
    data = body.model_dump()
    _set_received_coherence(data, status_value=data["status"], current_received=None)
    item = DocumentRequest(id=uuid4(), created_at=datetime.now(UTC), **data)
    created = await repo.create(item)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="created",
        entity_type="document_request",
        entity_id=created.id,
        practice_id=created.practice_id,
        metadata={"name": created.name, "status": created.status},
    )
    return created


@router.patch("/{doc_id}", response_model=DocumentRequest)
async def update_document_request(
    doc_id: UUID,
    body: DocumentRequestUpdate,
    repo: Annotated[Repository[DocumentRequest], Depends(get_document_request_repo)],
    phase_repo: Annotated[Repository[PracticePhase], Depends(get_practice_phase_repo)],
    attachment_repo: Annotated[Repository[Attachment], Depends(get_attachment_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> DocumentRequest:
    """Aggiorna una voce (avanzamento stato, allegato ricevuto, scadenza, ...)."""
    current = await repo.get(str(doc_id))
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nessun campo da aggiornare",
        )
    new_status = updates.get("status", current.status)
    _check_transition(current.status, new_status)
    await _validate_refs(
        phase_repo,
        attachment_repo,
        practice_id=current.practice_id,
        phase_id=updates.get("phase_id"),
        attachment_id=updates.get("attachment_id"),
    )
    _set_received_coherence(updates, status_value=new_status, current_received=current.received_at)
    updated = await repo.update(str(doc_id), **updates)
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="updated",
        entity_type="document_request",
        entity_id=updated.id,
        practice_id=updated.practice_id,
        metadata={"name": updated.name, "status": updated.status},
    )
    return updated


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_document_request(
    doc_id: UUID,
    repo: Annotated[Repository[DocumentRequest], Depends(get_document_request_repo)],
    activity_repo: Annotated[Repository[ActivityLog], Depends(get_activity_log_repo)],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
) -> Response:
    """Rimuove una voce dalla checklist e registra l'azione."""
    item = await repo.get(str(doc_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")
    await repo.delete(str(doc_id))
    await ActivityService(activity_repo).log(
        actor_id=current_user_id,
        action="deleted",
        entity_type="document_request",
        entity_id=item.id,
        practice_id=item.practice_id,
        metadata={"name": item.name},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
