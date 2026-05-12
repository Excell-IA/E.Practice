"""InMemoryRepository — implementazione V0 del contratto Repository.

Stato vive in un `dict[str, T]` per il lifetime del processo. Restart del
backend → reload dal seed JSON (vedi seed_loader, PR047).

V1: sostituito da SQLAlchemyRepository senza toccare i router/services che
dipendono solo dal contratto astratto.
"""

from __future__ import annotations

from collections.abc import Iterable
from copy import deepcopy
from typing import Any, cast

from app.repositories.base import (
    AlreadyExistsError,
    NotFoundError,
    Repository,
    T,
)


def _matches(item: Any, filters: dict[str, Any]) -> bool:
    """True se `item` soddisfa tutti i filtri (AND logico).

    Supporta dotted attribute access (`practice.client.id`) e match diretto
    su valori scalari. Per filtrare su appartenenza a una lista passare un
    `set`/`list`: il match è `value in container`.
    """
    for key, expected in filters.items():
        actual: Any = item
        for part in key.split("."):
            actual = getattr(actual, part, None)
            if actual is None and expected is not None:
                return False
        if isinstance(expected, set | list | tuple) and not isinstance(actual, set | list | tuple):
            if actual not in expected:
                return False
        elif actual != expected:
            return False
    return True


class InMemoryRepository(Repository[T]):
    """Repository in memoria.

    Args:
        entity_name: stringa usata negli errori (es. "Practice", "Client").
        seed: iterable di entità con cui pre-popolare lo storage (opzionale).
        id_attr: nome dell'attributo che funge da chiave primaria (default 'id').
    """

    def __init__(
        self,
        entity_name: str,
        seed: Iterable[T] | None = None,
        id_attr: str = "id",
    ) -> None:
        self._entity_name = entity_name
        self._id_attr = id_attr
        self._items: dict[str, T] = {}
        if seed:
            for item in seed:
                self._items[self._key(item)] = item

    def _key(self, item: T) -> str:
        value = getattr(item, self._id_attr)
        return str(value)

    async def get(self, id: str) -> T | None:
        item = self._items.get(str(id))
        return deepcopy(item) if item is not None else None

    async def list(self, **filters: Any) -> list[T]:
        if not filters:
            return [deepcopy(item) for item in self._items.values()]
        return [deepcopy(item) for item in self._items.values() if _matches(item, filters)]

    async def create(self, item: T) -> T:
        key = self._key(item)
        if key in self._items:
            raise AlreadyExistsError(self._entity_name, key)
        stored = deepcopy(item)
        self._items[key] = stored
        return deepcopy(stored)

    async def update(self, id: str, **updates: Any) -> T:
        key = str(id)
        existing = self._items.get(key)
        if existing is None:
            raise NotFoundError(self._entity_name, key)

        # Usa Pydantic v2 model_copy se disponibile (preserva validazione).
        if hasattr(existing, "model_copy"):
            updated = cast(T, existing.model_copy(update=updates))
        else:
            updated = deepcopy(existing)
            for field, value in updates.items():
                setattr(updated, field, value)

        self._items[key] = updated
        return deepcopy(updated)

    async def delete(self, id: str) -> None:
        key = str(id)
        if key not in self._items:
            raise NotFoundError(self._entity_name, key)
        del self._items[key]

    async def count(self, **filters: Any) -> int:
        if not filters:
            return len(self._items)
        return sum(1 for item in self._items.values() if _matches(item, filters))

    # --- Helper non parte del contratto astratto, ma comodo per test/seed ---

    def _clear(self) -> None:
        """Svuota lo storage. Riservato a test e a seed_loader.reload()."""
        self._items.clear()

    def _seed_replace(self, items: Iterable[T]) -> None:
        """Sostituisce in blocco lo storage (idempotente). Usato dal seed loader."""
        self._items = {self._key(item): deepcopy(item) for item in items}
