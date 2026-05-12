"""Repository pattern generic — contratto astratto per accesso ai dati.

In V0 implementato da `InMemoryRepository` (PR039). In V1 sostituito da
`SQLAlchemyRepository` senza toccare gli endpoint che dipendono dal contratto.

L'entità `T` è un Pydantic model con almeno il campo `id: str | UUID`.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, Protocol, TypeVar, runtime_checkable


@runtime_checkable
class HasId(Protocol):
    """Contratto minimo per essere gestiti dal Repository: un attributo `id`."""

    id: Any  # str | UUID | int — concreto definito dai modelli Pydantic in F3


T = TypeVar("T", bound=HasId)


class Repository(ABC, Generic[T]):
    """Contratto astratto. Tutte le implementazioni sono asincrone."""

    @abstractmethod
    async def get(self, id: str) -> T | None:
        """Ritorna l'entità per id, oppure None se non esiste."""

    @abstractmethod
    async def list(self, **filters: Any) -> list[T]:
        """Ritorna tutte le entità che matchano i filtri (AND logico).

        Filtri come kwargs: `repo.list(status="aperta", responsible_id=uid)`.
        Lista vuota se niente matcha; mai None.
        """

    @abstractmethod
    async def create(self, item: T) -> T:
        """Inserisce una nuova entità. Solleva `AlreadyExistsError` se id duplicato."""

    @abstractmethod
    async def update(self, id: str, **updates: Any) -> T:
        """Aggiorna i campi specificati. Solleva `NotFoundError` se id non esiste.

        I `updates` sono campi del modello: i validatori Pydantic vengono applicati.
        """

    @abstractmethod
    async def delete(self, id: str) -> None:
        """Cancella l'entità. Solleva `NotFoundError` se id non esiste.

        V0: hard delete. V1+: soft delete con `deleted_at` per le tabelle L1.
        """

    @abstractmethod
    async def count(self, **filters: Any) -> int:
        """Conta le entità che matchano i filtri. Più efficiente di `len(list(...))`."""


# --- Errori espliciti del contratto ---


class RepositoryError(Exception):
    """Base per tutti gli errori del layer Repository."""


class NotFoundError(RepositoryError):
    """Sollevato quando una `get/update/delete` non trova l'entità richiesta."""

    def __init__(self, entity: str, id: str) -> None:
        super().__init__(f"{entity} not found: id={id}")
        self.entity = entity
        self.id = id


class AlreadyExistsError(RepositoryError):
    """Sollevato quando `create` riceve un id già esistente."""

    def __init__(self, entity: str, id: str) -> None:
        super().__init__(f"{entity} already exists: id={id}")
        self.entity = entity
        self.id = id
