"""Adapter REST asincrono verso E.Contacts."""

from __future__ import annotations

from time import perf_counter
from typing import Any
from uuid import UUID

import httpx

from app.logging_setup import get_logger

log = get_logger("ework.epractice.contacts")


class ContactsClientError(RuntimeError):
    """Errore esplicito del servizio E.Contacts."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class ContactsClient:
    """Thin client senza conoscenza dello storage E.Contacts."""

    def __init__(self, base_url: str, timeout_seconds: float = 3.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    @staticmethod
    def _headers(
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        if correlation_id:
            headers["X-Correlation-Id"] = correlation_id
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        authorization: str | None = None,
        correlation_id: str | None = None,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        started = perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.request(
                    method,
                    f"{self._base_url}{path}",
                    headers=self._headers(authorization, correlation_id),
                    json=json,
                    params=params,
                )
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            log.warning(
                "econtacts_unavailable",
                method=method,
                path=path,
                duration_ms=round((perf_counter() - started) * 1000),
            )
            raise ContactsClientError(503, "E.Contacts non disponibile") from exc

        duration_ms = round((perf_counter() - started) * 1000)
        log.info(
            "econtacts_request",
            method=method,
            path=path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        if response.is_error:
            detail = response.text
            try:
                payload = response.json()
                detail = str(payload.get("detail", payload))
            except ValueError:
                pass
            raise ContactsClientError(response.status_code, detail)
        if response.status_code == 204:
            return None
        return response.json()

    async def list_subjects(
        self,
        *,
        authorization: str | None,
        correlation_id: str | None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        data = await self._request(
            "GET",
            "/soggetti",
            authorization=authorization,
            correlation_id=correlation_id,
            params={"limit": limit, "offset": offset, "stato": "operativo"},
        )
        return list(data)

    async def search(
        self,
        query: str,
        *,
        authorization: str | None,
        correlation_id: str | None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        data = await self._request(
            "GET",
            "/soggetti/ricerca",
            authorization=authorization,
            correlation_id=correlation_id,
            params={"testo": query, "limit": limit},
        )
        return list(data)

    async def get_subject(
        self,
        target_type: str,
        target_id: UUID,
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        path = (
            f"/persone/{target_id}"
            if target_type == "persona"
            else f"/soggetti/azienda/{target_id}"
        )
        return dict(
            await self._request(
                "GET",
                path,
                authorization=authorization,
                correlation_id=correlation_id,
            )
        )

    async def create_company(
        self,
        payload: dict[str, Any],
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "POST",
                "/aziende",
                authorization=authorization,
                correlation_id=correlation_id,
                json=payload,
            )
        )

    async def create_person(
        self,
        payload: dict[str, Any],
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "POST",
                "/persone",
                authorization=authorization,
                correlation_id=correlation_id,
                json=payload,
            )
        )

    async def create_relation(
        self,
        person_id: UUID,
        company_id: UUID,
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "POST",
                "/relazioni",
                authorization=authorization,
                correlation_id=correlation_id,
                json={
                    "id_azienda": str(company_id),
                    "id_persona": str(person_id),
                    "ruolo_funzione": "referente",
                },
            )
        )

    async def create_site(
        self,
        company_id: UUID,
        payload: dict[str, Any],
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "POST",
                f"/aziende/{company_id}/sedi",
                authorization=authorization,
                correlation_id=correlation_id,
                json=payload,
            )
        )

    async def update_site(
        self,
        site_id: UUID,
        payload: dict[str, Any],
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "PATCH",
                f"/sedi/{site_id}",
                authorization=authorization,
                correlation_id=correlation_id,
                json=payload,
            )
        )

    async def update_subject(
        self,
        target_type: str,
        target_id: UUID,
        payload: dict[str, Any],
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> dict[str, Any]:
        return dict(
            await self._request(
                "PATCH",
                f"/soggetti/{target_type}/{target_id}",
                authorization=authorization,
                correlation_id=correlation_id,
                json=payload,
            )
        )

    async def delete_subject(
        self,
        target_type: str,
        target_id: UUID,
        *,
        authorization: str | None,
        correlation_id: str | None,
    ) -> None:
        await self._request(
            "DELETE",
            f"/soggetti/{target_type}/{target_id}",
            authorization=authorization,
            correlation_id=correlation_id,
        )
