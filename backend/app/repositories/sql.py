"""Repository SQLAlchemy async per il DB condiviso E.Work.

Implementa lo stesso contratto di `InMemoryRepository`, ma legge/scrive tabelle
`practice_*` nello schema tenant gia' selezionato dalla sessione.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any, Generic, cast

from pydantic import BaseModel
from sqlalchemy import RowMapping, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import AlreadyExistsError, NotFoundError, Repository, T


class SQLAlchemyRepository(Repository[T], Generic[T]):
    def __init__(
        self,
        *,
        session: AsyncSession,
        entity_name: str,
        table_name: str,
        model: type[T],
        columns: Sequence[str],
        field_to_column: dict[str, str] | None = None,
        json_columns: Sequence[str] = (),
        order_by: str | None = None,
        soft_delete: bool = False,
    ) -> None:
        self._session = session
        self._entity_name = entity_name
        self._table_name = table_name
        self._model = model
        self._columns = set(columns)
        self._field_to_column = field_to_column or {}
        self._column_to_field = {value: key for key, value in self._field_to_column.items()}
        self._json_columns = set(json_columns)
        self._order_by = order_by
        self._soft_delete = soft_delete

    async def get(self, id: str) -> T | None:
        where = "id = :id"
        if self._soft_delete:
            where = f"{where} AND is_deleted = false"
        result = await self._session.execute(
            text(f"SELECT * FROM {self._table_name} WHERE {where}"),
            {"id": id},
        )
        row = result.mappings().first()
        return self._row_to_model(row) if row is not None else None

    async def list(self, **filters: Any) -> list[T]:
        clauses: list[str] = []
        params: dict[str, Any] = {}
        if self._soft_delete:
            clauses.append("is_deleted = false")
        for field, value in filters.items():
            column = self._column_for(field)
            param = f"p_{len(params)}"
            if value is None:
                clauses.append(f"{column} IS NULL")
            elif isinstance(value, set | list | tuple):
                clauses.append(f"{column} = ANY(:{param})")
                params[param] = list(value)
            else:
                clauses.append(f"{column} = :{param}")
                params[param] = value
        sql = f"SELECT * FROM {self._table_name}"
        if clauses:
            sql = f"{sql} WHERE {' AND '.join(clauses)}"
        if self._order_by:
            sql = f"{sql} ORDER BY {self._order_by}"
        result = await self._session.execute(text(sql), params)
        return [self._row_to_model(row) for row in result.mappings()]

    async def create(self, item: T) -> T:
        values = self._item_to_db(item)
        columns = list(values.keys())
        params = {f"v_{col}": value for col, value in values.items()}
        col_sql = ", ".join(columns)
        value_sql = ", ".join(f":v_{col}" for col in columns)
        try:
            result = await self._session.execute(
                text(
                    f"INSERT INTO {self._table_name} ({col_sql}) "
                    f"VALUES ({value_sql}) RETURNING *"
                ),
                params,
            )
            await self._session.commit()
        except Exception as exc:
            await self._session.rollback()
            if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
                raise AlreadyExistsError(self._entity_name, str(item.id)) from exc
            raise
        row = result.mappings().one()
        return self._row_to_model(row)

    async def update(self, id: str, **updates: Any) -> T:
        values = self._updates_to_db(updates)
        if not values:
            existing = await self.get(id)
            if existing is None:
                raise NotFoundError(self._entity_name, id)
            return existing
        assignments = ", ".join(f"{column} = :v_{column}" for column in values)
        params = {f"v_{column}": value for column, value in values.items()}
        params["id"] = id
        result = await self._session.execute(
            text(f"UPDATE {self._table_name} SET {assignments} " "WHERE id = :id RETURNING *"),
            params,
        )
        row = result.mappings().first()
        if row is None:
            await self._session.rollback()
            raise NotFoundError(self._entity_name, id)
        await self._session.commit()
        return self._row_to_model(row)

    async def delete(self, id: str) -> None:
        if self._soft_delete:
            result = await self._session.execute(
                text(
                    f"UPDATE {self._table_name} SET is_deleted = true, deleted_at = now() "
                    "WHERE id = :id RETURNING id"
                ),
                {"id": id},
            )
        else:
            result = await self._session.execute(
                text(f"DELETE FROM {self._table_name} WHERE id = :id RETURNING id"),
                {"id": id},
            )
        if result.first() is None:
            await self._session.rollback()
            raise NotFoundError(self._entity_name, id)
        await self._session.commit()

    async def count(self, **filters: Any) -> int:
        clauses: list[str] = []
        params: dict[str, Any] = {}
        if self._soft_delete:
            clauses.append("is_deleted = false")
        for field, value in filters.items():
            column = self._column_for(field)
            param = f"p_{len(params)}"
            if value is None:
                clauses.append(f"{column} IS NULL")
            else:
                clauses.append(f"{column} = :{param}")
                params[param] = value
        sql = f"SELECT COUNT(*) AS total FROM {self._table_name}"
        if clauses:
            sql = f"{sql} WHERE {' AND '.join(clauses)}"
        result = await self._session.execute(text(sql), params)
        return int(result.scalar_one())

    def _column_for(self, field: str) -> str:
        column = self._field_to_column.get(field, field)
        if column not in self._columns:
            raise ValueError(f"Filtro non supportato per {self._entity_name}: {field}")
        return column

    def _item_to_db(self, item: T) -> dict[str, Any]:
        raw = (
            cast(BaseModel, item).model_dump(mode="python")
            if isinstance(item, BaseModel)
            else dict(vars(item))
        )
        return self._to_db_values(raw)

    def _updates_to_db(self, updates: dict[str, Any]) -> dict[str, Any]:
        return self._to_db_values(updates)

    def _to_db_values(self, raw: dict[str, Any]) -> dict[str, Any]:
        values: dict[str, Any] = {}
        for field, value in raw.items():
            column = self._field_to_column.get(field, field)
            if column in self._columns:
                if column in self._json_columns and value is not None:
                    value = json.dumps(value, ensure_ascii=False)
                values[column] = value
        return values

    def _row_to_model(self, row: RowMapping) -> T:
        data: dict[str, Any] = {}
        model_fields = set(getattr(self._model, "model_fields", {}))
        for column, value in dict(row).items():
            field = self._column_to_field.get(column, column)
            if field in model_fields:
                data[field] = value
        return self._model.model_validate(data)  # type: ignore[attr-defined,no-any-return]
