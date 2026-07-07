import base64
import hashlib
import hmac
import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.provisioning import PracticeProvisioning


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _token(*, tenant_id: str = "excellia", user_id: str = "__system__", is_system: bool) -> str:
    settings = get_settings()
    header = {"alg": settings.jwt_algorithm, "typ": "JWT"}
    payload = {"user_id": user_id, "tenant_id": tenant_id, "is_system": is_system}
    raw_header = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    raw_payload = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signed = f"{raw_header}.{raw_payload}".encode("ascii")
    signature = hmac.new(settings.jwt_secret.encode("utf-8"), signed, hashlib.sha256).digest()
    return f"{raw_header}.{raw_payload}.{_b64url(signature)}"


def test_internal_provisioning_requires_system_token() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/internal/provisioning",
            headers={"Authorization": f"Bearer {_token(is_system=False)}"},
        )

    assert response.status_code == 403


def test_internal_provisioning_calls_practice_provisioning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def fake_provision_tenant(tenant_id: str) -> str:
        calls.append(tenant_id)
        return f"tenant_{tenant_id}"

    monkeypatch.setattr(
        PracticeProvisioning,
        "provision_tenant",
        staticmethod(fake_provision_tenant),
    )

    with TestClient(app) as client:
        response = client.post(
            "/internal/provisioning",
            headers={"Authorization": f"Bearer {_token(tenant_id='studioleali', is_system=True)}"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "tenant_id": "studioleali",
        "schema": "tenant_studioleali",
        "status": "provisioned",
    }
    assert calls == ["studioleali"]
