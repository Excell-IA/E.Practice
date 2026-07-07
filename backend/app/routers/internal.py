"""Endpoint interni chiamati dalla shell E.Work."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import TokenPayload, get_system_caller
from app.provisioning import PracticeProvisioning

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/provisioning")
async def internal_provisioning(
    token: Annotated[TokenPayload, Depends(get_system_caller)],
) -> dict[str, str]:
    """Provisioning tenant EW110, chiamato solo con token M2M della shell."""
    tenant_id = token["tenant_id"]
    try:
        result = await PracticeProvisioning.provision_tenant(tenant_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return {
        "tenant_id": result.tenant_id,
        "schema": result.schema,
        "status": result.status,
        "module_status": result.module_status,
    }
