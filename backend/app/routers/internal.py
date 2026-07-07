"""Endpoint interni chiamati dalla shell E.Work."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import TokenPayload, get_system_caller
from app.provisioning import PracticeProvisioning

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/provisioning")
async def internal_provisioning(
    token: Annotated[TokenPayload, Depends(get_system_caller)],
) -> dict[str, str]:
    """Provisioning tenant EW110, chiamato solo con token M2M della shell."""
    tenant_id = token["tenant_id"]
    schema = await PracticeProvisioning.provision_tenant(tenant_id)
    return {"tenant_id": tenant_id, "schema": schema, "status": "provisioned"}
